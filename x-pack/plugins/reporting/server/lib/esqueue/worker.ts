/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import events from 'events';
import moment from 'moment';
// @ts-ignore
import Puid from 'puid';

import { Client } from 'elasticsearch';
import { Esqueue, Logger } from '.';
import { Poller } from '../../../../../common/poller';
import { constants } from './constants';
import { CancellationToken } from './helpers/cancellation_token';
import { UnspecifiedWorkerError, WorkerTimeoutError } from './helpers/errors';
import { JobDocument, JobResponse } from './job';

const puid = new Puid();

function formatJobObject(job: JobResponse) {
  return {
    index: job._index,
    type: job._type,
    id: job._id,
  };
}

// tslint:disable-next-line
function noop() { }

function getLogger(opts: { logger?: Logger }, id: string, logLevel: string) {
  return (msg: string, err?: Error) => {
    const logger = opts.logger || noop;

    const message = `${id} - ${msg}`;
    const tags = ['worker', logLevel];

    if (err) {
      logger(`${message}: ${err.stack ? err.stack : err}`, tags);
      return;
    }

    logger(message, tags);
  };
}

export type WorkerFunc = (payload: any, cancellationToken: CancellationToken) => Promise<any>;

interface DocOutput {
  content: any;
  content_type: string | boolean;
  max_size_reached?: boolean;
  size?: number;
}

export interface WorkerOptions {
  client?: Client;
  size?: number;
  doctype?: string;
  logger?: Logger;
  interval: number;
  intervalErrorMultiplier: number;
}

export class Worker extends events.EventEmitter {
  public readonly queue: Esqueue;
  public readonly client: Client;
  public readonly id: string;
  public readonly jobtype: string;
  public readonly workerFn: WorkerFunc;
  public readonly checkSize: number;
  public readonly doctype: string;
  public readonly debug: (msg: string, err?: Error) => void;
  public readonly warn: (msg: string, err?: Error) => void;

  private running: boolean;
  private poller: Poller;

  constructor(queue: Esqueue, type: string, workerFn: WorkerFunc, opts: WorkerOptions) {
    if (typeof type !== 'string') {
      throw new Error('type must be a string');
    }
    if (typeof workerFn !== 'function') {
      throw new Error('workerFn must be a function');
    }
    if (typeof opts !== 'object') {
      throw new Error('opts must be an object');
    }
    if (typeof opts.interval !== 'number') {
      throw new Error('opts.interval must be a number');
    }
    if (typeof opts.intervalErrorMultiplier !== 'number') {
      throw new Error('opts.intervalErrorMultiplier must be a number');
    }

    super();

    this.id = puid.generate();
    this.queue = queue;
    this.client = opts.client || this.queue.client;
    this.jobtype = type;
    this.workerFn = workerFn;
    this.checkSize = opts.size || 10;
    this.doctype = opts.doctype || constants.DEFAULT_SETTING_DOCTYPE;

    this.debug = getLogger(opts, this.id, 'debug');
    this.warn = getLogger(opts, this.id, 'warn');

    this.running = true;
    this.debug(`Created worker for job type ${this.jobtype}`);

    this.poller = new Poller({
      functionToPoll: () => {
        return this._processPendingJobs();
      },
      pollFrequencyInMillis: opts.interval,
      trailing: true,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: opts.intervalErrorMultiplier,
    });
    this._startJobPolling();
  }

  public destroy() {
    this.running = false;
    this._stopJobPolling();
  }

  public toJSON() {
    return {
      id: this.id,
      index: this.queue.index,
      jobType: this.jobtype,
      doctype: this.doctype,
    };
  }

  public emit(name: string, ...args: any[]) {
    super.emit(name, ...args);
    return this.queue.emit(name, ...args);
  }

  private _formatErrorParams(err: Error, job?: JobResponse) {
    const response: any = {
      error: err,
      worker: this.toJSON(),
    };

    if (job) {
      response.job = formatJobObject(job);
    }
    return response;
  }

  private _claimJob(job: JobResponse) {
    const m = moment();
    const startTime = m.toISOString();
    const expirationTime = m.add(job._source.timeout).toISOString();
    const attempts = job._source.attempts + 1;

    if (attempts > job._source.max_attempts) {
      const msg = !job._source.output
        ? `Max attempts reached (${job._source.max_attempts})`
        : false;
      return this._failJob(job, msg).then(() => false);
    }

    const doc = {
      attempts,
      started_at: startTime,
      process_expiration: expirationTime,
      status: constants.JOB_STATUS_PROCESSING,
    };

    return this.client
      .update({
        index: job._index,
        type: job._type,
        id: job._id,
        version: job._version,
        body: { doc },
      })
      .then(response => {
        const updatedJob = {
          ...job,
          ...response,
        };
        updatedJob._source = {
          ...job._source,
          ...doc,
        };
        return updatedJob;
      });
  }

  private _failJob(job: JobResponse, output: any = false) {
    this.warn(`Failing job ${job._id}`);

    const completedTime = moment().toISOString();
    const docOutput = this._formatOutput(output);
    const doc = {
      status: constants.JOB_STATUS_FAILED,
      completed_at: completedTime,
      output: docOutput,
    };

    this.emit(constants.EVENT_WORKER_JOB_FAIL, {
      job: formatJobObject(job),
      worker: this.toJSON(),
      output: docOutput,
    });

    return this.client
      .update({
        index: job._index,
        type: job._type,
        id: job._id,
        version: job._version,
        body: { doc },
      })
      .then(() => true)
      .catch(err => {
        if (err.statusCode === 409) {
          return true;
        }
        this.warn(`_failJob failed to update job ${job._id}`, err);
        this.emit(constants.EVENT_WORKER_JOB_UPDATE_ERROR, this._formatErrorParams(err, job));
        return false;
      });
  }

  private _formatOutput(output: any): DocOutput {
    const unknownMime = false;

    if (typeof output === 'object' && output.content) {
      return {
        content: output.content,
        content_type: output.content_type || unknownMime,
        max_size_reached: output.max_size_reached,
        size: output.size,
      };
    } else {
      return {
        content: output || null,
        content_type: unknownMime,
      };
    }
  }

  private _performJob(job: JobResponse) {
    this.debug(`Starting job ${job._id}`);

    const workerOutput = new Promise((resolve, reject) => {
      // run the worker's workerFn
      let isResolved = false;
      const cancellationToken = new CancellationToken();
      Promise.resolve(this.workerFn.call(null, job._source.payload, cancellationToken))
        .then(res => {
          isResolved = true;
          resolve(res);
        })
        .catch(err => {
          isResolved = true;
          reject(err);
        });

      // fail if workerFn doesn't finish before timeout
      setTimeout(() => {
        if (isResolved) {
          return;
        }

        cancellationToken.cancel();
        this.warn(`Timeout processing job ${job._id}`);
        reject(
          new WorkerTimeoutError(`Worker timed out, timeout = ${job._source.timeout}`, {
            timeout: job._source.timeout,
            jobId: job._id,
          })
        );
      }, job._source.timeout);
    });

    return workerOutput.then(
      output => {
        // job execution was successful
        this.debug(`Completed job ${job._id}`);

        const completedTime = moment().toISOString();
        const docOutput = this._formatOutput(output);

        const doc = {
          status: constants.JOB_STATUS_COMPLETED,
          completed_at: completedTime,
          output: docOutput,
        };

        return this.client
          .update({
            index: job._index,
            type: job._type,
            id: job._id,
            version: job._version,
            body: { doc },
          })
          .then(() => {
            const eventOutput = {
              job: formatJobObject(job),
              output: docOutput,
            };

            this.emit(constants.EVENT_WORKER_COMPLETE, eventOutput);
          })
          .catch(err => {
            if (err.statusCode === 409) {
              return false;
            }
            this.warn(`Failure saving job output ${job._id}`, err);
            this.emit(constants.EVENT_WORKER_JOB_UPDATE_ERROR, this._formatErrorParams(err, job));
          });
      },
      jobErr => {
        if (!jobErr) {
          jobErr = new UnspecifiedWorkerError('Unspecified worker error', {
            jobId: job._id,
          });
        }

        // job execution failed
        if (jobErr.name === 'WorkerTimeoutError') {
          this.warn(`Timeout on job ${job._id}`);
          this.emit(constants.EVENT_WORKER_JOB_TIMEOUT, this._formatErrorParams(jobErr, job));
          return false;

          // append the jobId to the error
        } else {
          try {
            Object.assign(jobErr, { jobId: job._id });
          } catch (e) {
            // do nothing if jobId can not be appended
          }
        }

        this.warn(`Failure occurred on job ${job._id}`, jobErr);
        this.emit(constants.EVENT_WORKER_JOB_EXECUTION_ERROR, this._formatErrorParams(jobErr, job));
        return this._failJob(job, jobErr.toString ? jobErr.toString() : false);
      }
    );
  }

  private _startJobPolling() {
    if (!this.running) {
      return;
    }

    this.poller.start();
  }

  private _stopJobPolling() {
    this.poller.stop();
  }

  private _processPendingJobs() {
    return this._getPendingJobs().then(jobs => {
      return this._claimPendingJobs(jobs);
    });
  }

  private _claimPendingJobs(jobs: JobResponse[]) {
    if (!jobs || jobs.length === 0) {
      return;
    }

    let claimed = false;

    // claim a single job, stopping after first successful claim
    return jobs
      .reduce((chain, job) => {
        return chain.then(claimedJob => {
          // short-circuit the promise chain if a job has been claimed
          if (claimed) {
            return claimedJob;
          }

          return this._claimJob(job)
            .then(claimResult => {
              claimed = true;
              return claimResult;
            })
            .catch(err => {
              if (err.statusCode === 409) {
                this.warn(
                  `_claimPendingJobs encountered a version conflict on updating pending job ${
                    job._id
                  }`,
                  err
                );
                return; // continue reducing and looking for a different job to claim
              }
              this.emit(constants.EVENT_WORKER_JOB_CLAIM_ERROR, this._formatErrorParams(err, job));
              throw err;
            });
        });
      }, Promise.resolve())
      .then(claimedJob => {
        if (!claimedJob) {
          this.debug(`Found no claimable jobs out of ${jobs.length} total`);
          return;
        }
        this.debug(`Claimed job ${claimedJob._id}`);
        return this._performJob(claimedJob);
      })
      .catch(err => {
        this.warn('Error claiming jobs', err);
        return Promise.reject(err);
      });
  }

  private _getPendingJobs(): Promise<JobResponse[]> {
    const nowTime = moment().toISOString();
    const query = {
      _source: {
        excludes: ['output.content'],
      },
      query: {
        bool: {
          filter: {
            bool: {
              minimum_should_match: 1,
              must: { term: { jobtype: this.jobtype } },
              should: [
                { term: { status: 'pending' } },
                {
                  bool: {
                    must: [
                      { term: { status: 'processing' } },
                      { range: { process_expiration: { lte: nowTime } } },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
      sort: [{ priority: { order: 'asc' } }, { created_at: { order: 'asc' } }],
      size: this.checkSize,
    };

    return this.client
      .search<JobDocument>({
        index: `${this.queue.index}-*`,
        type: this.doctype,
        version: true,
        body: query,
      })
      .then(results => {
        const jobs = results.hits.hits;
        if (jobs.length > 0) {
          this.debug(`${jobs.length} outstanding jobs returned`);
        }
        return jobs;
      })
      .catch(err => {
        // ignore missing indices errors
        if (err && err.status === 404) {
          return [];
        }

        this.warn('job querying failed', err);
        this.emit(constants.EVENT_WORKER_JOB_SEARCH_ERROR, this._formatErrorParams(err));
        throw err;
      });
  }
}
