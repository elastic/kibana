/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import {
  getMultiGroupAlertsCountTableColumns,
  getSingleGroupByAlertsCountTableColumns,
} from './columns';

describe('columns', () => {
  const defaultNumberFormat = '0,0.[000]';
  const stackByField0 = 'kibana.alert.rule.name';

  describe('getMultiGroupAlertsCountTableColumns', () => {
    const stackByField1 = 'host.name';

    test('it returns the expected columns', () => {
      expect(
        getMultiGroupAlertsCountTableColumns({
          defaultNumberFormat,
          stackByField0,
          stackByField1,
        }).map((x) => omit('render', x))
      ).toEqual([
        {
          'data-test-subj': 'stackByField0Key',
          field: 'key',
          name: 'Top 1000 values of kibana.alert.rule.name',
          truncateText: false,
        },
        {
          'data-test-subj': 'stackByField1Key',
          field: 'stackByField1Key',
          name: 'Top 1000 values of host.name',
          truncateText: false,
        },
        {
          'data-test-subj': 'stackByField1DocCount',
          dataType: 'number',
          field: 'stackByField1DocCount',
          name: 'Count of records',
          sortable: true,
          textOnly: true,
        },
      ]);
    });
  });

  describe('getSingleGroupByAlertsCountTableColumns', () => {
    test('it returns the expected columns', () => {
      expect(
        getSingleGroupByAlertsCountTableColumns({ defaultNumberFormat, stackByField0 }).map((x) =>
          omit('render', x)
        )
      ).toEqual([
        {
          'data-test-subj': 'stackByField0Key',
          field: 'key',
          name: 'kibana.alert.rule.name',
          truncateText: false,
        },
        {
          'data-test-subj': 'doc_count',
          dataType: 'number',
          field: 'doc_count',
          name: 'Count of records',
          sortable: true,
          textOnly: true,
        },
      ]);
    });
  });
});
