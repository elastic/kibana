/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { SLODefinition } from '../../domain/models';
import { createSLO, createSyntheticsAvailabilityIndicator } from '../fixtures/slo';
import { SyntheticsAvailabilityTransformGenerator } from './synthetics_availability';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import { twoMinute } from '../fixtures/duration';

const generator = new SyntheticsAvailabilityTransformGenerator();

describe('Synthetics Availability Transform Generator', () => {
  const spaceId = 'custom-space';

  it('returns the expected transform params', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createSyntheticsAvailabilityIndicator() });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform).toEqual({
      _meta: {
        managed: true,
        managed_by: 'observability',
        version: 3.2,
      },
      defer_validation: true,
      description: 'Rolled-up SLI data for SLO: irrelevant [id: irrelevant, revision: 1]',
      dest: {
        index: '.slo-observability.sli-v3.2',
        pipeline: '.slo-observability.sli.pipeline-v3.2',
      },
      frequency: '1m',
      pivot: {
        aggregations: {
          'slo.denominator': {
            filter: {
              term: {
                'summary.final_attempt': true,
              },
            },
          },
          'slo.numerator': {
            filter: {
              term: {
                'monitor.status': 'up',
              },
            },
          },
        },
        group_by: {
          '@timestamp': {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1m',
            },
          },
          'monitor.config_id': {
            terms: {
              field: 'config_id',
            },
          },
          'monitor.name': {
            terms: {
              field: 'monitor.name',
            },
          },
          'observer.name': {
            terms: {
              field: 'observer.name',
            },
          },
          'observer.geo.name': {
            terms: {
              field: 'observer.geo.name',
            },
          },
          'slo.groupings.monitor.name': {
            terms: {
              field: 'monitor.name',
            },
          },
          'slo.groupings.observer.geo.name': {
            terms: {
              field: 'observer.geo.name',
            },
          },
          'slo.groupings.monitor.id': {
            terms: {
              field: 'monitor.id',
            },
          },
          'slo.id': {
            terms: {
              field: 'slo.id',
            },
          },
          'slo.revision': {
            terms: {
              field: 'slo.revision',
            },
          },
        },
      },
      settings: {
        deduce_mappings: false,
        unattended: true,
      },
      source: {
        index: SYNTHETICS_INDEX_PATTERN,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'summary.final_attempt': true,
                },
              },
              {
                term: {
                  'meta.space_id': 'custom-space',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-7d/d',
                  },
                },
              },
            ],
          },
        },
        runtime_mappings: {
          'slo.id': {
            script: {
              source: "emit('irrelevant')",
            },
            type: 'keyword',
          },
          'slo.revision': {
            script: {
              source: 'emit(1)',
            },
            type: 'long',
          },
        },
      },
      sync: {
        time: {
          delay: '1m',
          field: 'event.ingested',
        },
      },
      transform_id: 'slo-irrelevant-1',
    });
    expect(transform.source.query?.bool?.filter).toContainEqual({
      term: {
        'summary.final_attempt': true,
      },
    });
  });

  it('groups by config id and observer.name when using default groupings', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createSyntheticsAvailabilityIndicator(),
    });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.pivot?.group_by).toEqual(
      expect.objectContaining({
        'monitor.config_id': {
          terms: {
            field: 'config_id',
          },
        },
        'observer.name': {
          terms: {
            field: 'observer.name',
          },
        },
      })
    );
  });

  it('does not include config id and observer.name when using non default groupings', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createSyntheticsAvailabilityIndicator(),
      groupBy: ['host.name'],
    });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.pivot?.group_by).not.toEqual(
      expect.objectContaining({
        'monitor.config_id': {
          terms: {
            field: 'config_id',
          },
        },
        'observer.name': {
          terms: {
            field: 'observer.name',
          },
        },
      })
    );

    expect(transform.pivot?.group_by).toEqual(
      expect.objectContaining({
        'slo.groupings.host.name': {
          terms: {
            field: 'host.name',
          },
        },
      })
    );
  });

  it.each([[[]], [[ALL_VALUE]]])(
    'adds observer.geo.name and monitor.name to groupings key by default, multi group by',
    async (groupBy) => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
        groupBy,
      });
      const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

      expect(transform.pivot?.group_by).toEqual(
        expect.objectContaining({
          'slo.groupings.monitor.name': {
            terms: {
              field: 'monitor.name',
            },
          },
          'slo.groupings.observer.geo.name': {
            terms: {
              field: 'observer.geo.name',
            },
          },
        })
      );
    }
  );

  it.each([[''], [ALL_VALUE]])(
    'adds observer.geo.name and monitor.name to groupings key by default, single group by',
    async (groupBy) => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
        groupBy,
      });
      const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

      expect(transform.pivot?.group_by).toEqual(
        expect.objectContaining({
          'slo.groupings.monitor.name': {
            terms: {
              field: 'monitor.name',
            },
          },
          'slo.groupings.observer.geo.name': {
            terms: {
              field: 'observer.geo.name',
            },
          },
        })
      );
    }
  );

  it.each([['host.name'], [['host.name']]])('handles custom groupBy', async (groupBy) => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createSyntheticsAvailabilityIndicator(),
      groupBy,
    });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.pivot?.group_by).toEqual(
      expect.objectContaining({
        'slo.groupings.host.name': {
          terms: {
            field: 'host.name',
          },
        },
      })
    );
  });

  it('filters by summary.final_attempt', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createSyntheticsAvailabilityIndicator() });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      term: {
        'summary.final_attempt': true,
      },
    });
  });

  it('adds tag filters', async () => {
    const tags = [
      { value: 'tag-1', label: 'tag1' },
      { value: 'tag-2', label: 'tag2' },
    ];
    const indicator = createSyntheticsAvailabilityIndicator();
    const slo = createSLO({
      id: 'irrelevant',
      indicator: {
        ...indicator,
        params: {
          ...indicator.params,
          tags,
        },
      } as SLODefinition['indicator'],
    });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      terms: {
        tags: ['tag-1', 'tag-2'],
      },
    });
    expect(transform.pivot?.group_by?.tags).toEqual({
      terms: {
        field: 'tags',
      },
    });
  });

  it('adds monitorId filter', async () => {
    const monitorIds = [
      { value: 'id-1', label: 'Monitor name 1' },
      { value: 'id-2', label: 'Monitor name 2' },
    ];
    const indicator = createSyntheticsAvailabilityIndicator();
    const slo = createSLO({
      id: 'irrelevant',
      indicator: {
        ...indicator,
        params: {
          ...indicator.params,
          monitorIds,
        },
      } as SLODefinition['indicator'],
    });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      terms: {
        'monitor.id': ['id-1', 'id-2'],
      },
    });
    expect(transform.pivot?.group_by?.['monitor.id']).toEqual({
      terms: {
        field: 'monitor.id',
      },
    });
  });

  it('adds project id filter', async () => {
    const projects = [
      { value: 'id-1', label: 'Project name 1' },
      { value: 'id-2', label: 'Project name 2' },
    ];
    const indicator = createSyntheticsAvailabilityIndicator();
    const slo = createSLO({
      id: 'irrelevant',
      indicator: {
        ...indicator,
        params: {
          ...indicator.params,
          projects,
        },
      } as SLODefinition['indicator'],
    });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      terms: {
        'monitor.project.id': ['id-1', 'id-2'],
      },
    });
    expect(transform.pivot?.group_by?.['monitor.project.id']).toEqual({
      terms: {
        field: 'monitor.project.id',
      },
    });
  });

  it('filters by space', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createSyntheticsAvailabilityIndicator() });
    const transform = await generator.getTransformParams(slo, spaceId, dataViewsService);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      term: {
        'meta.space_id': spaceId,
      },
    });
  });

  it("overrides the range filter when 'preventInitialBackfill' is true", async () => {
    const slo = createSLO({
      indicator: createSyntheticsAvailabilityIndicator(),
      settings: {
        frequency: twoMinute(),
        syncDelay: twoMinute(),
        preventInitialBackfill: true,
      },
    });

    const transform = await generator.getTransformParams(slo, 'default', dataViewsService);

    // @ts-ignore
    const rangeFilter = transform.source.query.bool.filter.find((f) => 'range' in f);

    expect(rangeFilter).toEqual({
      range: {
        '@timestamp': {
          gte: 'now-300s/m', // 2m + 2m + 60s
        },
      },
    });
  });
});
