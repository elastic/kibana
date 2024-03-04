/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createKQLCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { KQLCustomTransformGenerator } from './kql_custom';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';

const generator = new KQLCustomTransformGenerator();

describe('KQL Custom Transform Generator', () => {
  describe('validation', () => {
    it('throws when the KQL numerator is invalid', () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ good: '{ kql.query: invalid' }),
      });
      expect(generator.getTransformParams(anSLO, dataViewsService)).rejects.toThrow(/Invalid KQL/);
    });
    it('throws when the KQL denominator is invalid', () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ total: '{ kql.query: invalid' }),
      });
      expect(generator.getTransformParams(anSLO, dataViewsService)).rejects.toThrow(/Invalid KQL/);
    });
    it('throws when the KQL query_filter is invalid', () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ filter: '{ kql.query: invalid' }),
      });
      expect(generator.getTransformParams(anSLO, dataViewsService)).rejects.toThrow(/Invalid KQL/);
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const transform = await generator.getTransformParams(anSLO, dataViewsService);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createKQLCustomIndicator(),
    });
    const transform = await generator.getTransformParams(anSLO, dataViewsService);

    expect(transform).toMatchSnapshot();
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ filter: 'labels.groupId: group-4' }),
    });
    const transform = await generator.getTransformParams(anSLO, dataViewsService);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ index: 'my-own-index*' }),
    });
    const transform = await generator.getTransformParams(anSLO, dataViewsService);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('uses the provided timestampField', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        timestampField: 'my-date-field',
      }),
    });
    const transform = await generator.getTransformParams(anSLO, dataViewsService);

    expect(transform.sync?.time?.field).toBe('my-date-field');
    // @ts-ignore
    expect(transform.pivot?.group_by['@timestamp'].date_histogram.field).toBe('my-date-field');
  });

  it('aggregates using the numerator kql', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        good: 'latency < 400 and (http.status_code: 2xx or http.status_code: 3xx or http.status_code: 4xx)',
      }),
    });
    const transform = await generator.getTransformParams(anSLO, dataViewsService);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the denominator kql', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        total: 'http.status_code: *',
      }),
    });
    const transform = await generator.getTransformParams(anSLO, dataViewsService);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });
});
