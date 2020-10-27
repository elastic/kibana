/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import cloneDeep from 'lodash/cloneDeep';
import { deserializePolicy, legacySerializePolicy } from './policy_serialization';
import { defaultNewColdPhase, defaultNewDeletePhase } from '../../constants';
import { DataTierAllocationType } from '../../../../common/types';

describe('Policy serialization', () => {
  test('serialize a policy using "default" data allocation', () => {
    expect(
      legacySerializePolicy(
        {
          name: 'test',
          phases: {
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
            cold: {
              actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
            },
          },
        }
      )
    ).toEqual({
      name: 'test',
      phases: {
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
      legacySerializePolicy(
        {
          name: 'test',
          phases: {
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
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
      legacySerializePolicy(
        {
          name: 'test',
          phases: {
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
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
      legacySerializePolicy(
        {
          name: 'test',
          phases: {
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {
            hot: { actions: {} },
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
        cold: {
          actions: { allocate: { include: {}, exclude: {}, require: { something: 'here' } } },
        },
      },
    };

    const originalClone = cloneDeep(originalPolicy);

    const deserializedPolicy = {
      name: 'test',
      phases: {
        cold: {
          ...defaultNewColdPhase,
          dataTierAllocationType: 'none' as DataTierAllocationType,
          selectedNodeAttrs: 'ignore:this',
          phaseEnabled: true,
        },

        delete: { ...defaultNewDeletePhase },
      },
    };

    legacySerializePolicy(deserializedPolicy, originalPolicy);
    expect(originalPolicy).toEqual(originalClone);
  });

  test('serialize a policy using "best_compression" codec for forcemerge', () => {
    expect(
      legacySerializePolicy(
        {
          name: 'test',
          phases: {
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
      phases: {},
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
          },
        },
      })
    ).toEqual({
      name: 'test',
      phases: {
        delete: { ...defaultNewDeletePhase },
      },
    });
  });

  test('delete "best_compression" codec for forcemerge if disabled in UI', () => {
    expect(
      legacySerializePolicy(
        {
          name: 'test',
          phases: {
            delete: { ...defaultNewDeletePhase },
          },
        },
        {
          name: 'test',
          phases: {},
        }
      )
    ).toEqual({
      name: 'test',
      phases: {},
    });
  });
});
