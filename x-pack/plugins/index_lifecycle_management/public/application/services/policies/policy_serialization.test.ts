/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
//Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import cloneDeep from 'lodash/cloneDeep';
import { serializePolicy } from './policy_serialization';
import {
  defaultNewColdPhase,
  defaultNewDeletePhase,
  defaultNewHotPhase,
  defaultNewWarmPhase,
} from '../../constants';
import { DataTierAllocationType } from '../../../../common/types';

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
});
