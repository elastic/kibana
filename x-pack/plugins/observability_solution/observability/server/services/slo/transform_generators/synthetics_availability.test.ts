/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { SLO } from '../../../domain/models';
import { createSLO, createSyntheticsAvailabilityIndicator } from '../fixtures/slo';
import { SyntheticsAvailabilityTransformGenerator } from './synthetics_availability';

const generator = new SyntheticsAvailabilityTransformGenerator();

describe('APM Transaction Duration Transform Generator', () => {
  const spaceId = 'custom-space';

  it('returns the expected transform params', () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createSyntheticsAvailabilityIndicator() });
    const transform = generator.getTransformParams(slo, spaceId);

    expect(transform).toEqual({
      _meta: {
        managed: true,
        managed_by: 'observability',
        version: 3,
      },
      defer_validation: true,
      description: 'Rolled-up SLI data for SLO: irrelevant [id: irrelevant, revision: 1]',
      dest: {
        index: '.slo-observability.sli-v3',
        pipeline: '.slo-observability.sli.pipeline-v3',
      },
      frequency: '1m',
      pivot: {
        aggregations: {
          'slo.denominator': {
            filter: {
              exists: {
                field: 'summary.final_attempt',
              },
            },
          },
          'slo.numerator': {
            filter: {
              range: {
                'summary.up': {
                  gte: 1,
                },
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
          config_id: {
            terms: {
              field: 'config_id',
            },
          },
          'monitor.id': {
            terms: {
              field: 'monitor.id',
            },
          },
          'monitor.project.id': {
            terms: {
              field: 'monitor.project.id',
            },
          },
          'observer.name': {
            terms: {
              field: 'observer.name',
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
          'slo.id': {
            terms: {
              field: 'slo.id',
            },
          },
          'slo.instanceId': {
            terms: {
              field: 'slo.instanceId',
            },
          },
          'slo.revision': {
            terms: {
              field: 'slo.revision',
            },
          },
          tags: {
            terms: {
              field: 'tags',
            },
          },
        },
      },
      settings: {
        deduce_mappings: false,
        unattended: true,
      },
      source: {
        index: 'synthetics-*',
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
              {
                terms: {
                  'monitor.id': [],
                },
              },
              {
                terms: {
                  tags: [],
                },
              },
              {
                terms: {
                  'monitor.project.id': [],
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
          'slo.instanceId': {
            script: {
              source: "emit('*')",
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
          field: '@timestamp',
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

  it('auto groups by config id, monitor.id, and observer.name', () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createSyntheticsAvailabilityIndicator() });
    const transform = generator.getTransformParams(slo, spaceId);

    expect(transform.pivot?.group_by).toEqual(
      expect.objectContaining({
        config_id: {
          terms: {
            field: 'config_id',
          },
        },
        'monitor.id': {
          terms: {
            field: 'monitor.id',
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

  it.each([[[]], [[ALL_VALUE]]])(
    'adds observer.geo.name and monitor.name to groupings key by default, multi group by',
    (groupBy) => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
        groupBy,
      });
      const transform = generator.getTransformParams(slo, spaceId);

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
    (groupBy) => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createSyntheticsAvailabilityIndicator(),
        groupBy,
      });
      const transform = generator.getTransformParams(slo, spaceId);

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

  it.each([['host.name'], [['host.name']]])('handles custom groupBy', (groupBy) => {
    const slo = createSLO({
      id: 'irrelevant',
      indicator: createSyntheticsAvailabilityIndicator(),
      groupBy,
    });
    const transform = generator.getTransformParams(slo, spaceId);

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

  it('filters by summary.final_attempt', () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createSyntheticsAvailabilityIndicator() });
    const transform = generator.getTransformParams(slo, spaceId);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      term: {
        'summary.final_attempt': true,
      },
    });
  });

  it('adds tag filters', () => {
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
      } as SLO['indicator'],
    });
    const transform = generator.getTransformParams(slo, spaceId);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      terms: {
        tags: ['tag-1', 'tag-2'],
      },
    });
  });

  it('adds monitorId filter', () => {
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
      } as SLO['indicator'],
    });
    const transform = generator.getTransformParams(slo, spaceId);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      terms: {
        'monitor.id': ['id-1', 'id-2'],
      },
    });
  });

  it('adds project id filter', () => {
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
      } as SLO['indicator'],
    });
    const transform = generator.getTransformParams(slo, spaceId);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      terms: {
        'monitor.project.id': ['id-1', 'id-2'],
      },
    });
  });

  it('filters by space', () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createSyntheticsAvailabilityIndicator() });
    const transform = generator.getTransformParams(slo, spaceId);

    expect(transform.source.query?.bool?.filter).toContainEqual({
      term: {
        'meta.space_id': spaceId,
      },
    });
  });
});
