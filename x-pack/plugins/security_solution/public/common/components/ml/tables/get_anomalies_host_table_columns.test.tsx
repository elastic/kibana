/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../mock/match_media';
import { getAnomaliesHostTableColumnsCurated } from './get_anomalies_host_table_columns';
import { HostsType } from '../../../../hosts/store/model';
import * as i18n from './translations';

jest.mock('../../../lib/kibana');

const startDate = new Date(2001).toISOString();
const endDate = new Date(3000).toISOString();

describe('get_anomalies_host_table_columns', () => {
  test('on hosts page, we expect to get all columns', () => {
    expect(getAnomaliesHostTableColumnsCurated(HostsType.page, startDate, endDate).length).toEqual(
      6
    );
  });

  test('on host details page, we expect to remove one columns', () => {
    const columns = getAnomaliesHostTableColumnsCurated(HostsType.details, startDate, endDate);
    expect(columns.length).toEqual(5);
  });

  test('on host page, we should have Host Name', () => {
    const columns = getAnomaliesHostTableColumnsCurated(HostsType.page, startDate, endDate);
    expect(columns.some((col) => col.name === i18n.HOST_NAME)).toEqual(true);
  });

  test('on host details page, we should not have Host Name', () => {
    const columns = getAnomaliesHostTableColumnsCurated(HostsType.details, startDate, endDate);
    expect(columns.some((col) => col.name === i18n.HOST_NAME)).toEqual(false);
  });
});
