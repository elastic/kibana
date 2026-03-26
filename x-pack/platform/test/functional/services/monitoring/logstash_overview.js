/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringLogstashOverviewProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const SUBJ_OVERVIEW_PAGE = 'logstashOverviewPage';

  return new (class LogstashOverview {
    async isOnOverview() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_OVERVIEW_PAGE));
      return pageId !== null;
    }
  })();
}
