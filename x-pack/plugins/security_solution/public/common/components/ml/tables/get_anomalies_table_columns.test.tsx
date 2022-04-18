/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../mock/match_media';
import * as i18n from './translations';
import { AnomaliesBy, Anomaly } from '../types';
import { Columns } from '../../paginated_table';
import React from 'react';
import { TestProviders } from '../../../mock';
import { useMountAppended } from '../../../utils/use_mount_appended';
import { getAnomaliesDefaultTableColumns } from './get_anomalies_table_columns';

jest.mock('../../../lib/kibana');

const startDate = new Date(2001).toISOString();
const endDate = new Date(3000).toISOString();
describe('getAnomaliesDefaultTableColumns', () => {
  const mount = useMountAppended();

  test('it should return all columns', () => {
    expect(getAnomaliesDefaultTableColumns(startDate, endDate).length).toEqual(5);
  });

  test('it should return an empty column string for undefined influencers', () => {
    const columns = getAnomaliesDefaultTableColumns(startDate, endDate);
    const column = columns.find((col) => col.name === i18n.INFLUENCED_BY) as Columns<
      Anomaly['influencers'],
      AnomaliesBy
    >;
    const anomaly: AnomaliesBy = {
      anomaly: {
        detectorIndex: 0,
        entityName: 'entity-name-1',
        entityValue: 'entity-value-1',
        jobId: 'job-1',
        rowId: 'row-1',
        severity: 100,
        time: new Date('01/01/2000').valueOf(),
        source: {
          job_id: 'job-1',
          result_type: 'result-1',
          probability: 50,
          multi_bucket_impact: 0,
          record_score: 0,
          initial_record_score: 0,
          bucket_span: 0,
          detector_index: 0,
          is_interim: true,
          timestamp: new Date('01/01/2000').valueOf(),
          by_field_name: 'some field name',
          by_field_value: 'some field value',
          partition_field_name: 'partition field name',
          partition_field_value: 'partition field value',
          function: 'function-1',
          function_description: 'description-1',
          typical: [5, 3],
          actual: [7, 4],
          influencers: [],
        },
      },
    };
    if (column != null && column.render != null) {
      const wrapper = mount(<TestProviders>{column.render(undefined, anomaly)}</TestProviders>);
      expect(wrapper.text()).toEqual('');
    } else {
      expect(column).not.toBe(null);
    }
  });
});
