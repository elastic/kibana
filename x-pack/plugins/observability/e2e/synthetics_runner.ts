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

import { esArchiverUnload } from './tasks/es_archiver';

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

  async loadTestFiles(callback: () => Promise<void>) {
    console.log('Loading test files');
    await callback();
    this.testFilesLoaded = true;
    console.log('Successfully loaded test files');
  }

  async loadTestData(e2eDir: string, dataArchives: string[]) {
    try {
      console.log('Loading esArchiver...');

      const esArchiver = this.getService('esArchiver');

      const promises = dataArchives.map((archive) => esArchiver.loadIfNeeded(e2eDir + archive));

      await Promise.all([
        ...promises,
        esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote'),
      ]);
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
    const results = await syntheticsRun({
      params: { kibanaUrl: this.kibanaUrl, getService: this.getService },
      playwrightOptions: { headless, chromiumSandbox: false, timeout: 60 * 1000 },
      match: match === 'undefined' ? '' : match,
      pauseOnError,
    });

    await this.assertResults(results);
  }

  assertResults(results: PromiseType<ReturnType<typeof syntheticsRun>>) {
    Object.entries(results).forEach(([_journey, result]) => {
      if (result.status !== 'succeeded') {
        throw new Error('Tests failed');
      }
    });
  }

  cleanUp() {
    console.log('Removing esArchiver...');
    esArchiverUnload('full_heartbeat');
    esArchiverUnload('browser');
  }
}
