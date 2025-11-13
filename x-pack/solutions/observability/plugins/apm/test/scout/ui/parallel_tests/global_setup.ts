/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import type { ApmFields, SynthtraceGenerator } from '@kbn/apm-synthtrace-client';
import { opbeans } from '../fixtures/synthtrace/opbeans';
import { servicesDataFromTheLast24Hours } from '../fixtures/synthtrace/last_24_hours';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({ apmSynthtraceEsClient, apiServices, log, config, esClient }, use) => {
    if (!config.isCloud) {
      await apiServices.fleet.internal.setup();
      log.info('Fleet infrastructure setup completed');
      await apiServices.fleet.agent.setup();
      log.info('Fleet agents setup completed');
    }
    const opbeansDataGenerator: SynthtraceGenerator<ApmFields> = opbeans({
      from: new Date(testData.OPBEANS_START_DATE).getTime(),
      to: new Date(testData.OPBEANS_END_DATE).getTime(),
    });

    await apmSynthtraceEsClient.index(opbeansDataGenerator);
    await apmSynthtraceEsClient.index(servicesDataFromTheLast24Hours());

    log.info('Cleaning up APM ML indices before running the APM tests');
    const jobs = await esClient.ml.getJobs();
    const apmJobs = jobs.jobs.filter((job) => job.job_id.startsWith('apm-'));
    for (const job of apmJobs) {
      try {
        await esClient.ml.stopDatafeed({ datafeed_id: `datafeed-${job.job_id}`, force: true });
        await esClient.ml.deleteDatafeed({ datafeed_id: `datafeed-${job.job_id}`, force: true });
      } catch (e) {
        // Datafeed might not exist
        log.warning(`Datafeed not found for job: ${job.job_id}`);
      }
      await esClient.ml.deleteJob({ job_id: job.job_id, force: true });
      log.info(`Deleted job: ${job.job_id}`);
    }
  }
);
