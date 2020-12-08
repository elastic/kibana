/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import cloneDeep from 'lodash/cloneDeep';
import { deserializePolicy, serializePolicy } from './policy_serialization';
import {
  defaultNewColdPhase,
  defaultNewDeletePhase,
  defaultNewHotPhase,
  defaultNewWarmPhase,
} from '../../constants';
import { DataTierAllocationType } from '../../../../common/types';
import { coldPhaseInitialization } from './cold_phase';
import { hotPhaseInitialization } from './hot_phase';
import { warmPhaseInitialization } from './warm_phase';
import { deletePhaseInitialization } from './delete_phase';

describe('Policy serialization', () => {
  test('serialize a policy using "default" data allocation', () => {
    expect(
      serializePolicy(
        {
          name: 'test',
          phases: {
            hot: { ...defaultNewHotPhase },
            warm: {
              ...defaultNewWarmPhase,
              dataTierAllocationType: 'default',
              // These selected attrs should be ignored
              selectedNodeAttrs: 'another:thing',
              phaseEnabled: true,
            },
            cold: {
              ...defaultNewColdPhase,
              dataTierAllocationType: 'default',
              selectedNodeAttrs: 'another:thing',
              phaseEnabled: true,
            },
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
            warm: {
              actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
            },
            cold: {
              actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
            },
          },
        }
      )
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          actions: {
            set_priority: {
              priority: 50,
            },
          },
        },
        cold: {
          actions: {
            set_priority: {
              priority: 0,
            },
          },
          min_age: '0d',
        },
      },
    });
  });

  test('serialize a policy using "custom" data allocation', () => {
    expect(
      serializePolicy(
        {
          name: 'test',
          phases: {
            hot: { ...defaultNewHotPhase },
            warm: {
              ...defaultNewWarmPhase,
              dataTierAllocationType: 'custom',
              selectedNodeAttrs: 'another:thing',
              phaseEnabled: true,
            },
            cold: {
              ...defaultNewColdPhase,
              dataTierAllocationType: 'custom',
              selectedNodeAttrs: 'another:thing',
              phaseEnabled: true,
            },
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
            warm: {
              actions: {
                allocate: {
                  include: { keep: 'this' },
                  exclude: { keep: 'this' },
                  require: { something: 'here' },
                },
              },
            },
            cold: {
              actions: {
                allocate: {
                  include: { keep: 'this' },
                  exclude: { keep: 'this' },
                  require: { something: 'here' },
                },
              },
            },
          },
        }
      )
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          actions: {
            allocate: {
              include: { keep: 'this' },
              exclude: { keep: 'this' },
              require: {
                another: 'thing',
              },
            },
            set_priority: {
              priority: 50,
            },
          },
        },
        cold: {
          actions: {
            allocate: {
              include: { keep: 'this' },
              exclude: { keep: 'this' },
              require: {
                another: 'thing',
              },
            },
            set_priority: {
              priority: 0,
            },
          },
          min_age: '0d',
        },
      },
    });
  });

  test('serialize a policy using "custom" data allocation with no node attributes', () => {
    expect(
      serializePolicy(
        {
          name: 'test',
          phases: {
            hot: { ...defaultNewHotPhase },
            warm: {
              ...defaultNewWarmPhase,
              dataTierAllocationType: 'custom',
              selectedNodeAttrs: '',
              phaseEnabled: true,
            },
            cold: {
              ...defaultNewColdPhase,
              dataTierAllocationType: 'custom',
              selectedNodeAttrs: '',
              phaseEnabled: true,
            },
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
            warm: {
              actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
            },
            cold: {
              actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
            },
          },
        }
      )
    ).toEqual({
      // There should be no allocation action in any phases...
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          actions: {
            allocate: { include: {}, exclude: {}, require: { something: 'here' } },
            set_priority: {
              priority: 50,
            },
          },
        },
        cold: {
          actions: {
            allocate: { include: {}, exclude: {}, require: { something: 'here' } },
            set_priority: {
              priority: 0,
            },
          },
          min_age: '0d',
        },
      },
    });
  });

  test('serialize a policy using "none" data allocation with no node attributes', () => {
    expect(
      serializePolicy(
        {
          name: 'test',
          phases: {
            hot: { ...defaultNewHotPhase },
            warm: {
              ...defaultNewWarmPhase,
              dataTierAllocationType: 'none',
              selectedNodeAttrs: 'ignore:this',
              phaseEnabled: true,
            },
            cold: {
              ...defaultNewColdPhase,
              dataTierAllocationType: 'none',
              selectedNodeAttrs: 'ignore:this',
              phaseEnabled: true,
            },
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
            warm: {
              actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
            },
            cold: {
              actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
            },
          },
        }
      )
    ).toEqual({
      // There should be no allocation action in any phases...
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          actions: {
            migrate: {
              enabled: false,
            },
            set_priority: {
              priority: 50,
            },
          },
        },
        cold: {
          actions: {
            migrate: {
              enabled: false,
            },
            set_priority: {
              priority: 0,
            },
          },
          min_age: '0d',
        },
      },
    });
  });

  test('serialization does not alter the original policy', () => {
    const originalPolicy = {
      name: 'test',
      phases: {
        hot: { actions: {} },
        warm: {
          actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
        },
        cold: {
          actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
        },
      },
    };

    const originalClone = cloneDeep(originalPolicy);

    const deserializedPolicy = {
      name: 'test',
      phases: {
        hot: { ...defaultNewHotPhase },
        warm: {
          ...defaultNewWarmPhase,
          dataTierAllocationType: 'none' as DataTierAllocationType,
          selectedNodeAttrs: 'ignore:this',
          phaseEnabled: true,
        },
        cold: {
          ...defaultNewColdPhase,
          dataTierAllocationType: 'none' as DataTierAllocationType,
          selectedNodeAttrs: 'ignore:this',
          phaseEnabled: true,
        },

        delete: { ...defaultNewDeletePhase },
      },
    };

    serializePolicy(deserializedPolicy, originalPolicy);
    deserializedPolicy.phases.warm.dataTierAllocationType = 'custom';
    serializePolicy(deserializedPolicy, originalPolicy);
    deserializedPolicy.phases.warm.dataTierAllocationType = 'default';
    serializePolicy(deserializedPolicy, originalPolicy);
    expect(originalPolicy).toEqual(originalClone);
  });

  test('serialize a policy using "best_compression" codec for forcemerge', () => {
    expect(
      serializePolicy(
        {
          name: 'test',
          phases: {
            hot: {
              ...defaultNewHotPhase,
              forceMergeEnabled: true,
              selectedForceMergeSegments: '1',
              bestCompressionEnabled: true,
            },
            warm: {
              ...defaultNewWarmPhase,
              phaseEnabled: true,
              forceMergeEnabled: true,
              selectedForceMergeSegments: '1',
              bestCompressionEnabled: true,
            },
            cold: {
              ...defaultNewColdPhase,
            },
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
          },
        }
      )
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            forcemerge: {
              max_num_segments: 1,
              index_codec: 'best_compression',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          actions: {
            forcemerge: {
              max_num_segments: 1,
              index_codec: 'best_compression',
            },
            set_priority: {
              priority: 50,
            },
          },
        },
      },
    });
  });

  test('serialization adds an empty delete action to delete phase', () => {
    expect(
      serializePolicy({
        name: 'test',
        phases: {
          hot: {
            ...defaultNewHotPhase,
          },
          warm: {
            ...defaultNewWarmPhase,
          },
          cold: {
            ...defaultNewColdPhase,
          },
          delete: { ...defaultNewDeletePhase, phaseEnabled: true },
        },
      })
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            set_priority: {
              priority: 100,
            },
          },
          min_age: '0ms',
        },
        delete: {
          min_age: '0d',
          actions: {
            delete: {},
          },
        },
      },
    });
  });

  test("serialization doesn't overwrite existing delete action in delete phase", () => {
    expect(
      serializePolicy(
        {
          name: 'test',
          phases: {
            hot: {
              ...defaultNewHotPhase,
            },
            warm: {
              ...defaultNewWarmPhase,
            },
            cold: {
              ...defaultNewColdPhase,
            },
            delete: { ...defaultNewDeletePhase, phaseEnabled: true },
          },
        },
        {
          name: 'test',
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                  max_size: '50gb',
                },
                set_priority: {
                  priority: 100,
                },
              },
              min_age: '0ms',
            },
            delete: {
              min_age: '0d',
              actions: {
                delete: {
                  delete_searchable_snapshot: true,
                },
              },
            },
          },
        }
      )
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            set_priority: {
              priority: 100,
            },
          },
          min_age: '0ms',
        },
        delete: {
          min_age: '0d',
          actions: {
            delete: {
              delete_searchable_snapshot: true,
            },
          },
        },
      },
    });
  });

  test('de-serialize a policy using "best_compression" codec for forcemerge', () => {
    expect(
      deserializePolicy({
        modified_date: Date.now().toString(),
        name: 'test',
        version: 1,
        policy: {
          name: 'test',
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_age: '30d',
                  max_size: '50gb',
                },
                forcemerge: {
                  max_num_segments: 1,
                  index_codec: 'best_compression',
                },
                set_priority: {
                  priority: 100,
                },
              },
            },
            warm: {
              actions: {
                forcemerge: {
                  max_num_segments: 1,
                  index_codec: 'best_compression',
                },
                set_priority: {
                  priority: 50,
                },
              },
            },
          },
        },
      })
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          ...defaultNewHotPhase,
          forceMergeEnabled: true,
          selectedForceMergeSegments: '1',
          bestCompressionEnabled: true,
        },
        warm: {
          ...defaultNewWarmPhase,
          warmPhaseOnRollover: false,
          phaseEnabled: true,
          forceMergeEnabled: true,
          selectedForceMergeSegments: '1',
          bestCompressionEnabled: true,
        },
        cold: {
          ...coldPhaseInitialization,
        },
        delete: { ...defaultNewDeletePhase },
      },
    });
  });

  test('delete "best_compression" codec for forcemerge if disabled in UI', () => {
    expect(
      serializePolicy(
        {
          name: 'test',
          phases: {
            hot: {
              ...defaultNewHotPhase,
              forceMergeEnabled: true,
              selectedForceMergeSegments: '1',
              bestCompressionEnabled: false,
            },
            warm: {
              ...defaultNewWarmPhase,
              phaseEnabled: true,
              forceMergeEnabled: true,
              selectedForceMergeSegments: '1',
              bestCompressionEnabled: false,
            },
            cold: {
              ...defaultNewColdPhase,
            },
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
            warm: {
              actions: {
                forcemerge: {
                  max_num_segments: 1,
                  index_codec: 'best_compression',
                },
              },
            },
          },
        }
      )
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          actions: {
            rollover: {
              max_age: '30d',
              max_size: '50gb',
            },
            forcemerge: {
              max_num_segments: 1,
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          actions: {
            forcemerge: {
              max_num_segments: 1,
            },
            set_priority: {
              priority: 50,
            },
          },
        },
      },
    });
  });

  test('de-serialization sets number of replicas in warm phase', () => {
    expect(
      deserializePolicy({
        modified_date: Date.now().toString(),
        name: 'test',
        version: 1,
        policy: {
          name: 'test',
          phases: {
            warm: {
              actions: {
                allocate: { include: {}, exclude: {}, number_of_replicas: 0 },
              },
            },
          },
        },
      })
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          ...hotPhaseInitialization,
        },
        warm: {
          ...defaultNewWarmPhase,
          phaseEnabled: true,
          selectedReplicaCount: '0',
          warmPhaseOnRollover: false,
          phaseIndexPriority: '',
        },
        cold: {
          ...coldPhaseInitialization,
        },
        delete: { ...deletePhaseInitialization },
      },
    });
  });

  test('de-serialization sets number of replicas in cold phase', () => {
    expect(
      deserializePolicy({
        modified_date: Date.now().toString(),
        name: 'test',
        version: 1,
        policy: {
          name: 'test',
          phases: {
            cold: {
              actions: {
                allocate: { include: {}, exclude: {}, number_of_replicas: 0 },
              },
            },
          },
        },
      })
    ).toEqual({
      name: 'test',
      phases: {
        hot: {
          ...hotPhaseInitialization,
        },
        warm: {
          ...warmPhaseInitialization,
        },
        cold: {
          ...coldPhaseInitialization,
          phaseEnabled: true,
          selectedReplicaCount: '0',
        },
        delete: { ...deletePhaseInitialization },
      },
    });
  });
});
