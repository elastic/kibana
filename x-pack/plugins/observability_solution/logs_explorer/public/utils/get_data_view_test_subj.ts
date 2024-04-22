/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const BASE_DATA_VIEW_TEST_SUBJ = 'logsExplorerDataView';

const publicDataViewPatternsSet = new Set(['logs-*', 'logstash-*', 'filebeat-*']);

export const getDataViewTestSubj = (title: string = '') => {
  if (publicDataViewPatternsSet.has(title)) {
    return [BASE_DATA_VIEW_TEST_SUBJ, cleanTitle(title)].join('_');
  }

  return BASE_DATA_VIEW_TEST_SUBJ;
};

const cleanTitle = (title: string) => title.slice(0, -2);
