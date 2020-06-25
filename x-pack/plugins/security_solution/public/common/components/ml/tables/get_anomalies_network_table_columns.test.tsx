/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnomaliesNetworkTableColumnsCurated } from './get_anomalies_network_table_columns';
import { NetworkType } from '../../../../network/store/model';
import * as i18n from './translations';
import { AnomaliesByNetwork, Anomaly } from '../types';
import { Columns } from '../../paginated_table';
import React from 'react';
import { TestProviders } from '../../../mock';
import { useMountAppended } from '../../../utils/use_mount_appended';

const startDate = new Date(2001).valueOf();
const endDate = new Date(3000).valueOf();

describe('get_anomalies_network_table_columns', () => {
  const mount = useMountAppended();

  test('on network page, we expect to get all columns', () => {
    expect(
      getAnomaliesNetworkTableColumnsCurated(NetworkType.page, startDate, endDate).length
    ).toEqual(6);
  });

  test('on network details page, we expect to remove one columns', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(NetworkType.details, startDate, endDate);
    expect(columns.length).toEqual(5);
  });

  test('on network page, we should have Network Name', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(NetworkType.page, startDate, endDate);
    expect(columns.some((col) => col.name === i18n.NETWORK_NAME)).toEqual(true);
  });

  test('on network details page, we should not have Network Name', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(NetworkType.details, startDate, endDate);
    expect(columns.some((col) => col.name === i18n.NETWORK_NAME)).toEqual(false);
  });

  test('on network page, we should escape the draggable id', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(NetworkType.page, startDate, endDate);
    const column = columns.find((col) => col.name === i18n.SCORE) as Columns<
      string,
      AnomaliesByNetwork
    >;
    const anomaly: AnomaliesByNetwork = {
      type: 'source.ip',
      ip: '127.0.0.1',
      anomaly: {
        detectorIndex: 0,
        entityName: 'entity-name-1',
        entityValue: 'entity-value-1',
        influencers: [],
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
      const wrapper = mount(<TestProviders>{column.render('', anomaly)}</TestProviders>);
      expect(
        wrapper
          .find(
            '[draggableId="draggableId.content.anomalies-network-table-severity-127_0_0_1-entity-name-1-entity-value-1-100-job-1"]'
          )
          .first()
          .exists()
      ).toBe(true);
    } else {
      expect(column).not.toBe(null);
    }
  });

  test('on network page, undefined influencers should turn into an empty column string', () => {
    const columns = getAnomaliesNetworkTableColumnsCurated(NetworkType.page, startDate, endDate);
    const column = columns.find((col) => col.name === i18n.INFLUENCED_BY) as Columns<
      Anomaly['influencers'],
      AnomaliesByNetwork
    >;
    const anomaly: AnomaliesByNetwork = {
      type: 'source.ip',
      ip: '127.0.0.1',
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
