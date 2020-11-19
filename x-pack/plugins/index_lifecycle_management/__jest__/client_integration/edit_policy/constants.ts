/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyFromES } from '../../../common/types';

export const POLICY_NAME = 'my_policy';
export const SNAPSHOT_POLICY_NAME = 'my_snapshot_policy';
export const NEW_SNAPSHOT_POLICY_NAME = 'my_new_snapshot_policy';

export const DEFAULT_POLICY: PolicyFromES = {
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    name: 'my_policy',
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          rollover: {
            max_age: '30d',
            max_size: '50gb',
          },
        },
      },
    },
  },
  name: 'my_policy',
};

export const POLICY_WITH_MIGRATE_OFF: PolicyFromES = {
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    name: 'my_policy',
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          rollover: {
            max_age: '30d',
            max_size: '50gb',
          },
        },
      },
      warm: {
        actions: {
          migrate: { enabled: false },
        },
      },
    },
  },
  name: 'my_policy',
};

export const POLICY_WITH_INCLUDE_EXCLUDE: PolicyFromES = {
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    name: 'my_policy',
    phases: {
      hot: {
        min_age: '123ms',
        actions: {
          rollover: {
            max_age: '30d',
            max_size: '50gb',
          },
        },
      },
      warm: {
        actions: {
          allocate: {
            include: {
              abc: '123',
            },
            exclude: {
              def: '456',
            },
          },
        },
      },
    },
  },
  name: 'my_policy',
};

export const DELETE_PHASE_POLICY: PolicyFromES = {
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    phases: {
      hot: {
        min_age: '0ms',
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
      delete: {
        min_age: '0ms',
        actions: {
          wait_for_snapshot: {
            policy: SNAPSHOT_POLICY_NAME,
          },
          delete: {
            delete_searchable_snapshot: true,
          },
        },
      },
    },
    name: POLICY_NAME,
  },
  name: POLICY_NAME,
};

export const getDefaultHotPhasePolicy = (policyName: string): PolicyFromES => ({
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    name: policyName,
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          rollover: {
            max_age: '30d',
            max_size: '50gb',
          },
        },
      },
    },
  },
  name: policyName,
});

export const POLICY_WITH_NODE_ATTR_AND_OFF_ALLOCATION: PolicyFromES = {
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          rollover: {
            max_size: '50gb',
          },
        },
      },
      warm: {
        actions: {
          allocate: {
            require: {},
            include: { test: '123' },
            exclude: {},
          },
        },
      },
      cold: {
        actions: {
          migrate: { enabled: false },
        },
      },
    },
    name: POLICY_NAME,
  },
  name: POLICY_NAME,
};

export const POLICY_WITH_NODE_ROLE_ALLOCATION: PolicyFromES = {
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          rollover: {
            max_size: '50gb',
          },
        },
      },
      warm: {
        actions: {},
      },
    },
    name: POLICY_NAME,
  },
  name: POLICY_NAME,
};
