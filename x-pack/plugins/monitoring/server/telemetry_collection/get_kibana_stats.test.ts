/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getUsageStats,
  combineStats,
  rollUpTotals,
  ensureTimeSpan,
  KibanaUsageStats,
} from './get_kibana_stats';
import { SearchResponse } from 'elasticsearch';

describe('Get Kibana Stats', () => {
  describe('Make a map of usage stats for each cluster', () => {
    test('passes through if there are no kibana instances', () => {
      const rawStats = {} as SearchResponse<KibanaUsageStats>;
      expect(getUsageStats(rawStats)).toStrictEqual({});
    });

    describe('with single cluster', () => {
      describe('single index', () => {
        test('for a single unused instance', () => {
          const rawStats = {
            hits: {
              hits: [
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test01' },
                      usage: {
                        dashboard: { total: 0 },
                        visualization: { total: 0 },
                        search: { total: 0 },
                        index_pattern: { total: 0 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
              ],
            },
          } as any;
          const expected = {
            clusterone: {
              dashboard: { total: 0 },
              visualization: { total: 0 },
              search: { total: 0 },
              index_pattern: { total: 0 },
              graph_workspace: { total: 1 },
              timelion_sheet: { total: 1 },
              indices: 1,
              plugins: {},
            },
          };

          expect(getUsageStats(rawStats)).toStrictEqual(expected);
        });

        test('for a single instance of active usage', () => {
          const rawStats = {
            hits: {
              hits: [
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test02' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
              ],
            },
          } as any;
          const expected = {
            clusterone: {
              dashboard: { total: 1 },
              visualization: { total: 3 },
              search: { total: 1 },
              index_pattern: { total: 1 },
              graph_workspace: { total: 1 },
              timelion_sheet: { total: 1 },
              indices: 1,
              plugins: {},
            },
          };
          expect(getUsageStats(rawStats)).toStrictEqual(expected);
        });

        test('it merges the plugin stats and kibana', () => {
          const rawStats = {
            hits: {
              hits: [
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test02' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
              ],
            },
          } as any;
          const expected = {
            clusterone: {
              dashboard: { total: 1 },
              visualization: { total: 3 },
              search: { total: 1 },
              index_pattern: { total: 1 },
              graph_workspace: { total: 1 },
              timelion_sheet: { total: 1 },
              indices: 1,
              plugins: {},
            },
          };
          expect(getUsageStats(rawStats)).toStrictEqual(expected);
        });

        test('flattens x-pack stats', () => {
          const rawStats = {
            hits: {
              hits: [
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test02' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                        foo: { total: 5 },
                        xpack: {
                          fancy: {
                            available: true,
                            total: 15,
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          } as any;

          expect(getUsageStats(rawStats)).toStrictEqual({
            clusterone: {
              dashboard: { total: 1 },
              visualization: { total: 3 },
              search: { total: 1 },
              index_pattern: { total: 1 },
              graph_workspace: { total: 1 },
              timelion_sheet: { total: 1 },
              indices: 1,
              plugins: { foo: { total: 5 }, fancy: { available: true, total: 15 } },
            },
          });
        });
      });

      describe('separate indices', () => {
        test('with one unused instance', () => {
          const rawStats = {
            hits: {
              hits: [
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test03' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test04' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test05' },
                      usage: {
                        dashboard: { total: 0 },
                        visualization: { total: 0 },
                        search: { total: 0 },
                        index_pattern: { total: 0 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-02',
                      },
                    },
                  },
                },
              ],
            },
          } as any;
          const expected = {
            clusterone: {
              dashboard: { total: 1 },
              visualization: { total: 3 },
              search: { total: 1 },
              index_pattern: { total: 1 },
              graph_workspace: { total: 2 },
              timelion_sheet: { total: 2 },
              indices: 2,
              plugins: {},
            },
          };
          expect(getUsageStats(rawStats)).toStrictEqual(expected);
        });

        test('with all actively used instances', () => {
          const rawStats = {
            hits: {
              hits: [
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test05' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test06' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test07' },
                      usage: {
                        dashboard: { total: 3 },
                        visualization: { total: 5 },
                        search: { total: 3 },
                        index_pattern: { total: 3 },
                        graph_workspace: { total: 1 },
                        timelion_sheet: { total: 1 },
                        index: '.kibana-test-02',
                      },
                    },
                  },
                },
              ],
            },
          } as any;
          const expected = {
            clusterone: {
              dashboard: { total: 4 },
              visualization: { total: 8 },
              search: { total: 4 },
              index_pattern: { total: 4 },
              graph_workspace: { total: 2 },
              timelion_sheet: { total: 2 },
              indices: 2,
              plugins: {},
            },
          };
          expect(getUsageStats(rawStats)).toStrictEqual(expected);
        });
      });
    });

    describe('with multiple clusters', () => {
      describe('separate indices', () => {
        test('with all actively used instances', () => {
          const rawStats = {
            hits: {
              hits: [
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test08' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 3 },
                        timelion_sheet: { total: 4 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test09' },
                      usage: {
                        dashboard: { total: 1 },
                        visualization: { total: 3 },
                        search: { total: 1 },
                        index_pattern: { total: 1 },
                        graph_workspace: { total: 3 },
                        timelion_sheet: { total: 4 },
                        index: '.kibana-test-01',
                      },
                    },
                  },
                },
                {
                  _source: {
                    cluster_uuid: 'clusterone',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test10' },
                      usage: {
                        dashboard: { total: 3 },
                        visualization: { total: 5 },
                        search: { total: 3 },
                        index_pattern: { total: 3 },
                        graph_workspace: { total: 3 },
                        timelion_sheet: { total: 4 },
                        index: '.kibana-test-02',
                      },
                    },
                  },
                },
                {
                  _source: {
                    cluster_uuid: 'clustertwo',
                    kibana_stats: {
                      kibana: { version: '7.0.0-alpha1-test11' },
                      usage: {
                        dashboard: { total: 300 },
                        visualization: { total: 500 },
                        search: { total: 300 },
                        index_pattern: { total: 300 },
                        graph_workspace: { total: 3 },
                        timelion_sheet: { total: 4 },
                        index: '.kibana-test-03',
                      },
                    },
                  },
                },
              ],
            },
          } as any;
          const expected = {
            clusterone: {
              dashboard: { total: 4 },
              visualization: { total: 8 },
              search: { total: 4 },
              index_pattern: { total: 4 },
              graph_workspace: { total: 6 },
              timelion_sheet: { total: 8 },
              indices: 2,
              plugins: {},
            },
            clustertwo: {
              dashboard: { total: 300 },
              visualization: { total: 500 },
              search: { total: 300 },
              index_pattern: { total: 300 },
              graph_workspace: { total: 3 },
              timelion_sheet: { total: 4 },
              indices: 1,
              plugins: {},
            },
          };
          expect(getUsageStats(rawStats)).toStrictEqual(expected);
        });
      });
    });
  });

  describe('Combines usage stats with high-level stats', () => {
    test('passes through if there are no kibana instances', () => {
      const highLevelStats = {};
      const usageStats = {};

      expect(combineStats(highLevelStats, usageStats)).toStrictEqual({});
    });

    describe('adds usage stats to high-level stats', () => {
      test('for a single cluster', () => {
        const highLevelStats = {
          clusterone: {
            count: 2,
            versions: [{ count: 2, version: '7.0.0-alpha1-test12' }],
          },
        } as any;
        const usageStats = {
          clusterone: {
            dashboard: { total: 1 },
            index_pattern: { total: 3 },
            indices: 2,
            search: { total: 1 },
            visualization: { total: 7 },
            plugins: {
              foo: { available: true },
            },
          },
        };

        expect(combineStats(highLevelStats, usageStats)).toStrictEqual({
          clusterone: {
            count: 2,
            dashboard: { total: 1 },
            index_pattern: { total: 3 },
            indices: 2,
            search: { total: 1 },
            versions: [{ count: 2, version: '7.0.0-alpha1-test12' }],
            visualization: { total: 7 },
            plugins: {
              foo: { available: true },
            },
          },
        });
      });

      test('for multiple single clusters', () => {
        const highLevelStats = {
          clusterone: {
            count: 2,
            versions: [{ count: 2, version: '7.0.0-alpha1-test13' }],
          },
          clustertwo: {
            count: 1,
            versions: [{ count: 1, version: '7.0.0-alpha1-test14' }],
          },
        } as any;
        const usageStats = {
          clusterone: {
            dashboard: { total: 1 },
            index_pattern: { total: 3 },
            indices: 2,
            search: { total: 1 },
            visualization: { total: 7 },
            plugins: {
              bar: { available: false },
            },
          },
          clustertwo: {
            dashboard: { total: 3 },
            index_pattern: { total: 5 },
            indices: 1,
            search: { total: 3 },
            visualization: { total: 15 },
            plugins: {
              bear: { enabled: true },
            },
          },
        };

        expect(combineStats(highLevelStats, usageStats)).toStrictEqual({
          clusterone: {
            count: 2,
            dashboard: { total: 1 },
            index_pattern: { total: 3 },
            indices: 2,
            search: { total: 1 },
            versions: [{ count: 2, version: '7.0.0-alpha1-test13' }],
            visualization: { total: 7 },
            plugins: {
              bar: { available: false },
            },
          },
          clustertwo: {
            count: 1,
            dashboard: { total: 3 },
            index_pattern: { total: 5 },
            indices: 1,
            search: { total: 3 },
            versions: [{ count: 1, version: '7.0.0-alpha1-test14' }],
            visualization: { total: 15 },
            plugins: {
              bear: { enabled: true },
            },
          },
        });
      });
    });

    describe('if usage stats are empty', () => {
      test('returns just high-level stats', () => {
        const highLevelStats = {
          clusterone: {
            count: 2,
            versions: [{ count: 2, version: '7.0.0-alpha1-test12' }],
          },
        } as any;
        const usageStats = undefined;

        expect(combineStats(highLevelStats, usageStats)).toStrictEqual({
          clusterone: {
            count: 2,
            versions: [{ count: 2, version: '7.0.0-alpha1-test12' }],
          },
        });
      });
    });
  });

  describe('Rolls up stats when there are multiple Kibana indices for a cluster', () => {
    test('by combining the `total` fields where previous was 0', () => {
      const rollUp = { my_field: { total: 0 } } as any;
      const addOn = { my_field: { total: 1 } };

      expect(rollUpTotals(rollUp, addOn, 'my_field' as any)).toStrictEqual({ total: 1 });
    });

    test('by combining the `total` fields with > 1 for previous and addOn', () => {
      const rollUp = { my_field: { total: 1 } } as any;
      const addOn = { my_field: { total: 3 } };

      expect(rollUpTotals(rollUp, addOn, 'my_field' as any)).toStrictEqual({ total: 4 });
    });
  });

  describe('Ensure minimum time difference', () => {
    test('should return start and end as is when none are provided', () => {
      const { start, end } = ensureTimeSpan(undefined, undefined);
      expect(start).toBe(undefined);
      expect(end).toBe(undefined);
    });

    test('should return start and end as is when only end is provided', () => {
      const initialEnd = '2020-01-01T00:00:00Z';
      const { start, end } = ensureTimeSpan(undefined, initialEnd);
      expect(start).toBe(undefined);
      expect(end).toEqual(initialEnd);
    });

    test('should return start and end as is because they are already 24h away', () => {
      const initialStart = '2019-12-31T00:00:00Z';
      const initialEnd = '2020-01-01T00:00:00Z';
      const { start, end } = ensureTimeSpan(initialStart, initialEnd);
      expect(start).toEqual(initialStart);
      expect(end).toEqual(initialEnd);
    });

    test('should return start and end as is because they are already 24h+ away', () => {
      const initialStart = '2019-12-31T00:00:00Z';
      const initialEnd = '2020-01-01T01:00:00Z';
      const { start, end } = ensureTimeSpan(initialStart, initialEnd);
      expect(start).toEqual(initialStart);
      expect(end).toEqual(initialEnd);
    });

    test('should modify start to a date 24h before end', () => {
      const initialStart = '2020-01-01T00:00:00.000Z';
      const initialEnd = '2020-01-01T01:00:00.000Z';
      const { start, end } = ensureTimeSpan(initialStart, initialEnd);
      expect(start).toEqual('2019-12-31T01:00:00.000Z');
      expect(end).toEqual(initialEnd);
    });

    test('should modify start to a date 24h before now', () => {
      const initialStart = new Date().toISOString();
      const { start, end } = ensureTimeSpan(initialStart, undefined);
      expect(start).not.toBe(initialStart);
      expect(end).toBe(undefined);
    });
  });
});
