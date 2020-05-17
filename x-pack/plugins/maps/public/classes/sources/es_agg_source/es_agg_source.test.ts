/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESAggSource } from '../es_agg_source';
import { IField } from '../../fields/field';
import { IESAggField } from '../../fields/es_agg_field';
import _ from 'lodash';
import { AGG_TYPE } from '../../../../common/constants';
import { AggDescriptor } from '../../../../common/descriptor_types';

jest.mock('ui/new_platform');

const sumFieldName = 'myFieldGettingSummed';
const metricExamples = [
  {
    type: AGG_TYPE.SUM,
    field: sumFieldName,
    label: 'my custom label',
  },
  {
    // metric config is invalid beause field is missing
    type: AGG_TYPE.MAX,
  },
  {
    // metric config is valid because "count" metric does not need to provide field
    type: AGG_TYPE.COUNT,
    label: '', // should ignore empty label fields
  },
];

class TestESAggSource extends AbstractESAggSource {
  constructor(metrics: AggDescriptor[]) {
    super({ type: 'test', id: 'foobar', indexPatternId: 'foobarid', metrics }, []);
  }
}

describe('getMetricFields', () => {
  it('should add default "count" metric when no metrics are provided', async () => {
    const source = new TestESAggSource([]);
    const metrics = source.getMetricFields();
    expect(metrics.length).toBe(1);

    expect(metrics[0].getName()).toEqual('doc_count');
    expect(await metrics[0].getLabel()).toEqual('count');
  });

  it('should remove incomplete metric configurations', async () => {
    const source = new TestESAggSource(metricExamples);
    const metrics = source.getMetricFields();
    expect(metrics.length).toBe(2);

    expect(metrics[0].getRootName()).toEqual(sumFieldName);
    expect(metrics[0].getName()).toEqual('sum_of_myFieldGettingSummed');
    expect(await metrics[0].getLabel()).toEqual('my custom label');

    expect(metrics[1].getName()).toEqual('doc_count');
    expect(await metrics[1].getLabel()).toEqual('count');
  });

  it('getMetrics should be identical to getFields', async () => {
    const source = new TestESAggSource(metricExamples);
    const metrics = source.getMetricFields();
    const fields = await source.getFields();

    const getFieldMeta = async (field: IField) => {
      const esAggField = field as IESAggField; // this ensures we can downcast correctly.
      return {
        name: esAggField.getName(),
        label: await esAggField.getLabel(),
        esDoc: esAggField.getRootName(),
      };
    };

    const metricsFieldMeta = await Promise.all(metrics.map(getFieldMeta));
    const fieldsFieldMeta = await Promise.all(fields.map(getFieldMeta));

    expect(_.isEqual(metricsFieldMeta, fieldsFieldMeta)).toEqual(true);
  });
});
