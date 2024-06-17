/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { twoMinute } from '../fixtures/duration';
import {
  createKQLCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { KQLCustomTransformGenerator } from './kql_custom';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';

const generator = new KQLCustomTransformGenerator();
const spaceId = 'custom-space';

describe('KQL Custom Transform Generator', () => {
  describe('validation', () => {
    it('throws when the KQL numerator is invalid', async () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ good: '{ kql.query: invalid' }),
      });
      await expect(generator.getTransformParams(anSLO, spaceId, dataViewsService)).rejects.toThrow(
        /Invalid KQL/
      );
    });
    it('throws when the KQL denominator is invalid', async () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ total: '{ kql.query: invalid' }),
      });
      await expect(generator.getTransformParams(anSLO, spaceId, dataViewsService)).rejects.toThrow(
        /Invalid KQL/
      );
    });
    it('throws when the KQL query_filter is invalid', async () => {
      const anSLO = createSLO({
        indicator: createKQLCustomIndicator({ filter: '{ kql.query: invalid' }),
      });
      await expect(generator.getTransformParams(anSLO, spaceId, dataViewsService)).rejects.toThrow(
        /Invalid KQL/
      );
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createKQLCustomIndicator(),
    });
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo using timesliceTarget = 0', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createKQLCustomIndicator(),
      objective: {
        target: 0.98,
        timesliceTarget: 0,
        timesliceWindow: twoMinute(),
      },
    });
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

    expect(transform).toMatchSnapshot();
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ filter: 'labels.groupId: group-4' }),
    });
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({ index: 'my-own-index*' }),
    });
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('uses the provided timestampField', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        timestampField: 'my-date-field',
      }),
    });
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

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
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the denominator kql', async () => {
    const anSLO = createSLO({
      indicator: createKQLCustomIndicator({
        total: 'http.status_code: *',
      }),
    });
    const transform = await generator.getTransformParams(anSLO, spaceId, dataViewsService);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });

  it("overrides the range filter when 'preventInitialBackfill' is true", async () => {
    const slo = createSLO({
      indicator: createKQLCustomIndicator(),
      settings: {
        frequency: twoMinute(),
        syncDelay: twoMinute(),
        preventInitialBackfill: true,
      },
    });

    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    // @ts-ignore
    const rangeFilter = transform.source.query.bool.filter.find((f) => 'range' in f);

    expect(rangeFilter).toEqual({
      range: {
        log_timestamp: {
          gte: 'now-300s/m', // 2m + 2m + 60s
        },
      },
    });
  });
});
