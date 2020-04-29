/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { createSeriesLink } from './create_series_link';

describe('create_series_link', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('it returns expected createKeyAndValue record with special left and right quotes', () => {
    const entities = createSeriesLink(
      anomalies.anomalies[0],
      new Date('1970').valueOf(),
      new Date('3000').valueOf()
    );
    expect(entities).toEqual(
      "ml#/timeseriesexplorer?_g=(ml:(jobIds:!(job-1)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'1970-01-01T00:00:00.000Z',mode:absolute,to:'3000-01-01T00:00:00.000Z'))&_a=(mlSelectInterval:(display:Auto,val:auto),mlSelectSeverity:(color:%23d2e9f7,display:warning,val:0),mlTimeSeriesExplorer:(detectorIndex:0,entities:(host.name:'zeek-iowa',process.name:'du',user.name:'root')))"
    );
  });
});
