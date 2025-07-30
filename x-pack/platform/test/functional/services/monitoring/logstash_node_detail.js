/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringLogstashNodeDetailProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_SUMMARY = 'logstashDetailStatus';
  const SUBJ_SUMMARY_HTTP_ADDRESS = `${SUBJ_SUMMARY} > httpAddress`;
  const SUBJ_SUMMARY_EVENTS_IN = `${SUBJ_SUMMARY} > eventsIn`;
  const SUBJ_SUMMARY_EVENTS_OUT = `${SUBJ_SUMMARY} > eventsOut`;
  const SUBJ_SUMMARY_NUM_RELOADS = `${SUBJ_SUMMARY} > numReloads`;
  const SUBJ_SUMMARY_PIPELINE_WORKERS = `${SUBJ_SUMMARY} > pipelineWorkers`;
  const SUBJ_SUMMARY_PIPELINE_BATCH_SIZE = `${SUBJ_SUMMARY} > pipelineBatchSize`;
  const SUBJ_SUMMARY_VERSION = `${SUBJ_SUMMARY} > version`;
  const SUBJ_SUMMARY_UPTIME = `${SUBJ_SUMMARY} > uptime`;

  return new (class LogstashNodeDetail {
    async clickPipelines() {
      return testSubjects.click('logstashNodeDetailPipelinesLink');
    }
    async clickAdvanced() {
      return testSubjects.click('logstashNodeDetailAdvancedLink');
    }

    async getSummary() {
      return {
        httpAddress: await testSubjects.getVisibleText(SUBJ_SUMMARY_HTTP_ADDRESS),
        eventsIn: await testSubjects.getVisibleText(SUBJ_SUMMARY_EVENTS_IN),
        eventsOut: await testSubjects.getVisibleText(SUBJ_SUMMARY_EVENTS_OUT),
        numReloads: await testSubjects.getVisibleText(SUBJ_SUMMARY_NUM_RELOADS),
        pipelineWorkers: await testSubjects.getVisibleText(SUBJ_SUMMARY_PIPELINE_WORKERS),
        pipelineBatchSize: await testSubjects.getVisibleText(SUBJ_SUMMARY_PIPELINE_BATCH_SIZE),
        version: await testSubjects.getVisibleText(SUBJ_SUMMARY_VERSION),
        uptime: await testSubjects.getVisibleText(SUBJ_SUMMARY_UPTIME),
      };
    }
  })();
}
