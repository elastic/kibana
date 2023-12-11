/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import Url from 'url';
import { run as syntheticsRun } from '@elastic/synthetics';
import { PromiseType } from 'utility-types';
import { createApmUsers } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/create_apm_users';

import { EsArchiver } from '@kbn/es-archiver';
import { esArchiverUnload } from '../tasks/es_archiver';
import { TestReporter } from './test_reporter';

export interface ArgParams {
  headless: boolean;
  match?: string;
  pauseOnError: boolean;
}

export class SyntheticsRunner {
  public getService: any;
  public kibanaUrl: string;
  private elasticsearchUrl: string;

  public testFilesLoaded: boolean = false;

  public params: ArgParams;

  private loadTestFilesCallback?: (reload?: boolean) => Promise<void>;

  constructor(getService: any, params: ArgParams) {
    this.getService = getService;
    this.kibanaUrl = this.getKibanaUrl();
    this.elasticsearchUrl = this.getElasticsearchUrl();
    this.params = params;
  }

  async setup() {
    await this.createTestUsers();
  }

  async createTestUsers() {
    await createApmUsers({
      elasticsearch: { node: this.elasticsearchUrl, username: 'elastic', password: 'changeme' },
      kibana: { hostname: this.kibanaUrl },
    });
  }

  async loadTestFiles(callback: (reload?: boolean) => Promise<void>, reload = false) {
    console.log('Loading test files');
    await callback(reload);
    this.loadTestFilesCallback = callback;
    this.testFilesLoaded = true;
    console.log('Successfully loaded test files');
  }

  async loadTestData(e2eDir: string, dataArchives: string[]) {
    try {
      console.log('Loading esArchiver...');

      const esArchiver: EsArchiver = this.getService('esArchiver');

      const promises = dataArchives.map((archive) => {
        if (archive === 'synthetics_data') {
          return esArchiver.load(e2eDir + archive, {
            docsOnly: true,
            skipExisting: true,
          });
        }
        return esArchiver.load(e2eDir + archive, { skipExisting: true });
      });

      await Promise.all([...promises]);
    } catch (e) {
      console.log(e);
    }
  }

  getKibanaUrl() {
    const config = this.getService('config');

    return Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    });
  }

  getElasticsearchUrl() {
    const config = this.getService('config');

    return Url.format({
      protocol: config.get('servers.elasticsearch.protocol'),
      hostname: config.get('servers.elasticsearch.hostname'),
      port: config.get('servers.elasticsearch.port'),
    });
  }

  async run() {
    if (!this.testFilesLoaded) {
      throw new Error('Test files not loaded');
    }
    const { headless, match, pauseOnError } = this.params;
    const noOfRuns = process.env.NO_OF_RUNS ? Number(process.env.NO_OF_RUNS) : 1;
    console.log(`Running ${noOfRuns} times`);
    let results: PromiseType<ReturnType<typeof syntheticsRun>> = {};
    for (let i = 0; i < noOfRuns; i++) {
      results = await syntheticsRun({
        params: { kibanaUrl: this.kibanaUrl, getService: this.getService },
        playwrightOptions: {
          headless,
          chromiumSandbox: false,
          timeout: 60 * 1000,
          viewport: {
            height: 900,
            width: 1600,
          },
          recordVideo: {
            dir: '.journeys/videos',
          },
        },
        match: match === 'undefined' ? '' : match,
        pauseOnError,
        screenshots: 'only-on-failure',
        reporter: TestReporter,
      });
      if (noOfRuns > 1) {
        // need to reload again since runner resets the journeys
        await this.loadTestFiles(this.loadTestFilesCallback!, true);
      }
    }

    await this.assertResults(results);
  }

  assertResults(results: PromiseType<ReturnType<typeof syntheticsRun>>) {
    Object.entries(results).forEach(([_journey, result]) => {
      if (result.status !== 'succeeded') {
        process.exitCode = 1;
        process.exit();
      }
    });
  }

  cleanUp() {
    console.log('Removing esArchiver...');
    esArchiverUnload('full_heartbeat');
    esArchiverUnload('browser');
  }
}
