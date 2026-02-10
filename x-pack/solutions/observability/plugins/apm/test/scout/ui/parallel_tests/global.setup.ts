/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { opbeans } from '../fixtures/synthtrace/opbeans';
import { servicesDataFromTheLast24Hours } from '../fixtures/synthtrace/last_24_hours';
import { generateSpanLinksData } from '../fixtures/synthtrace/generate_span_links_data';
import { generateSpanStacktraceData } from '../fixtures/synthtrace/generate_span_stacktrace_data';
import { otelSendotlp } from '../fixtures/synthtrace/otel_sendotlp';
import { adserviceEdot } from '../fixtures/synthtrace/adservice_edot';
import { mobileServices } from '../fixtures/synthtrace/mobile_services';
import { testData } from '../fixtures';
import { serviceDataWithRecentErrors } from '../fixtures/synthtrace/recent_errors';

globalSetupHook(
  'Ingest data to Elasticsearch',
  { tag: ['@ess', '@svlOblt'] },
  async ({ apmSynthtraceEsClient, apiServices, log, config, esClient }) => {
    const startTime = Date.now();
    if (!config.isCloud) {
      await apiServices.fleet.internal.setup();
      log.info('Fleet infrastructure setup completed');
      await apiServices.fleet.agent.setup();
      log.info('Fleet agents setup completed');
    }
    const opbeansDataGenerator: SynthtraceGenerator<ApmFields> = opbeans({
      from: new Date(testData.START_DATE).getTime(),
      to: new Date(testData.END_DATE).getTime(),
    });

    await apmSynthtraceEsClient.index(opbeansDataGenerator);
    await apmSynthtraceEsClient.index(servicesDataFromTheLast24Hours());

    // Generate span links data for span links tests
    const spanLinksData = generateSpanLinksData();
    await apmSynthtraceEsClient.index(spanLinksData);

    // Generate span stacktrace data for stacktrace tests
    const spanStacktraceData = generateSpanStacktraceData();
    await apmSynthtraceEsClient.index(spanStacktraceData);

    await apmSynthtraceEsClient.index(serviceDataWithRecentErrors());

    // Generate OTEL service data for OTEL service overview tests
    const otelData = otelSendotlp({
      from: new Date(testData.START_DATE).getTime(),
      to: new Date(testData.END_DATE).getTime(),
    });
    await apmSynthtraceEsClient.index(otelData);
    log.info('OTEL service data indexed');

    // Generate eDot service data for eDot service overview tests
    const edotData = adserviceEdot({
      from: new Date(testData.START_DATE).getTime(),
      to: new Date(testData.END_DATE).getTime(),
    });
    await apmSynthtraceEsClient.index(edotData);
    log.info('eDot service data indexed');

    // Generate mobile services data for mobile service overview tests
    const mobileData = mobileServices({
      from: new Date(testData.START_DATE).getTime(),
      to: new Date(testData.END_DATE).getTime(),
    });
    await apmSynthtraceEsClient.index(mobileData);
    log.info('Mobile services data indexed');

    log.info('Cleaning up APM ML indices before running the APM tests');
    const jobs = await esClient.ml.getJobs();
    const apmJobs = jobs.jobs.filter((job) => job.job_id.startsWith('apm-'));
    for (const job of apmJobs) {
      try {
        await esClient.ml.stopDatafeed({ datafeed_id: `datafeed-${job.job_id}`, force: true });
        await esClient.ml.deleteDatafeed({ datafeed_id: `datafeed-${job.job_id}`, force: true });
      } catch (error) {
        // Datafeed might not exist
        log.warning(`Datafeed not found for job: ${job.job_id}`, error);
      }
      await esClient.ml.deleteJob({ job_id: job.job_id, force: true });
      log.info(`Deleted job: ${job.job_id}`);
    }
    log.info(`APM data ingestion took ${Date.now() - startTime} ms`);
  }
);
