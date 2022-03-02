/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersType } from '../../../../users/store/model';
import '../../../mock/match_media';
import { getAnomaliesUserTableColumnsCurated } from './get_anomalies_user_table_columns';

import * as i18n from './translations';

jest.mock('../../../lib/kibana');

const startDate = new Date(2001).toISOString();
const endDate = new Date(3000).toISOString();

describe('get_anomalies_user_table_columns', () => {
  test('on users page, we expect to get all columns', () => {
    expect(getAnomaliesUserTableColumnsCurated(UsersType.page, startDate, endDate).length).toEqual(
      6
    );
  });

  test('on user details page, we expect to remove one columns', () => {
    const columns = getAnomaliesUserTableColumnsCurated(UsersType.details, startDate, endDate);
    expect(columns.length).toEqual(5);
  });

  test('on users page, we should have User Name', () => {
    const columns = getAnomaliesUserTableColumnsCurated(UsersType.page, startDate, endDate);
    expect(columns.some((col) => col.name === i18n.USER_NAME)).toEqual(true);
  });

  test('on user details page, we should not have User Name', () => {
    const columns = getAnomaliesUserTableColumnsCurated(UsersType.details, startDate, endDate);
    expect(columns.some((col) => col.name === i18n.USER_NAME)).toEqual(false);
  });
});
