/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

interface PollerOptions {
  functionToPoll: () => Promise<any>;
  pollFrequencyInMillis: number;
  trailing?: boolean;
  continuePollingOnError?: boolean;
  pollFrequencyErrorMultiplier?: number;
  successFunction?: (...args: any) => any;
  errorFunction?: (error: Error) => any;
}

// @TODO Maybe move to observables someday
export class Poller {
  private readonly functionToPoll: () => Promise<any>;
  private readonly successFunction: (...args: any) => any;
  private readonly errorFunction: (error: Error) => any;
  private _isRunning: boolean;
  private _timeoutId: NodeJS.Timeout | null;
  private pollFrequencyInMillis: number;
  private trailing: boolean;
  private continuePollingOnError: boolean;
  private pollFrequencyErrorMultiplier: number;

  constructor(options: PollerOptions) {
    this.functionToPoll = options.functionToPoll; // Must return a Promise
    this.successFunction = options.successFunction || _.noop;
    this.errorFunction = options.errorFunction || _.noop;
    this.pollFrequencyInMillis = options.pollFrequencyInMillis;
    this.trailing = options.trailing || false;
    this.continuePollingOnError = options.continuePollingOnError || false;
    this.pollFrequencyErrorMultiplier = options.pollFrequencyErrorMultiplier || 1;

    this._timeoutId = null;
    this._isRunning = false;
  }

  getPollFrequency() {
    return this.pollFrequencyInMillis;
  }

  _poll() {
    return this.functionToPoll()
      .then(this.successFunction)
      .then(() => {
        if (!this._isRunning) {
          return;
        }

        this._timeoutId = setTimeout(this._poll.bind(this), this.pollFrequencyInMillis);
      })
      .catch((e) => {
        this.errorFunction(e);
        if (!this._isRunning) {
          return;
        }

        if (this.continuePollingOnError) {
          this._timeoutId = setTimeout(
            this._poll.bind(this),
            this.pollFrequencyInMillis * this.pollFrequencyErrorMultiplier
          );
        } else {
          this.stop();
        }
      });
  }

  start() {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;
    if (this.trailing) {
      this._timeoutId = setTimeout(this._poll.bind(this), this.pollFrequencyInMillis);
    } else {
      this._poll();
    }
  }

  stop() {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;

    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }

    this._timeoutId = null;
  }

  isRunning() {
    return this._isRunning;
  }
}
