/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringEnterpriseSearchSummaryStatusProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_SUMMARY = 'entSearchSummaryStatus';
  const SUBJ_SUMMARY_INSTANCES = `${SUBJ_SUMMARY} > totalInstances`;
  const SUBJ_SUMMARY_ENGINES = `${SUBJ_SUMMARY} > appSearchEngines`;
  const SUBJ_SUMMARY_ORG_SOURCES = `${SUBJ_SUMMARY} > workplaceSearchOrgSources`;

  return new (class EnterpriseSearchSummaryStatus {
    async getContent() {
      return {
        instances: await testSubjects.getVisibleText(SUBJ_SUMMARY_INSTANCES),
        appSearchEngines: await testSubjects.getVisibleText(SUBJ_SUMMARY_ENGINES),
        workplaceSearchOrgSources: await testSubjects.getVisibleText(SUBJ_SUMMARY_ORG_SOURCES),
      };
    }
  })();
}
