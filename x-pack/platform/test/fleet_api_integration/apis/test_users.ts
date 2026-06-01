/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityService } from '@kbn/ftr-common-functional-services';

export const testUsers: {
  [rollName: string]: { username: string; password: string; permissions?: any };
} = {
  fleet_all_int_all: {
    permissions: {
      feature: {
        fleetv2: ['all'],
        fleet: ['all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_all_int_all',
    password: 'changeme',
  },
  fleet_all_int_all_default_space_only: {
    permissions: {
      feature: {
        fleetv2: ['all'],
        fleet: ['all'],
      },
      spaces: ['default'],
    },
    username: 'fleet_all_int_all_default_space_only',
    password: 'changeme',
  },
  fleet_read_only: {
    permissions: {
      feature: {
        fleetv2: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_read_only',
    password: 'changeme',
  },
  fleet_minimal_all_only: {
    permissions: {
      feature: {
        fleetv2: ['minimal_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_minimal_all_only',
    password: 'changeme',
  },
  fleet_minimal_read_only: {
    permissions: {
      feature: {
        fleetv2: ['minimal_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_minimal_read_only',
    password: 'changeme',
  },
  fleet_agents_read_only: {
    permissions: {
      feature: {
        fleetv2: ['agents_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agents_read_only',
    password: 'changeme',
  },
  fleet_agents_all_only: {
    permissions: {
      feature: {
        fleetv2: ['agents_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agents_all_only',
    password: 'changeme',
  },
  fleet_settings_read_only: {
    permissions: {
      feature: {
        fleetv2: ['settings_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_settings_read_only',
    password: 'changeme',
  },
  fleet_settings_all_only: {
    permissions: {
      feature: {
        fleetv2: ['settings_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_settings_all_only',
    password: 'changeme',
  },
  fleet_generate_report_only: {
    permissions: {
      feature: {
        fleetv2: ['generate_report'],
      },
      spaces: ['*'],
    },
    username: 'fleet_generate_report_only',
    password: 'changeme',
  },
  fleet_generate_report_agents_read_only: {
    permissions: {
      feature: {
        fleetv2: ['generate_report', 'agents_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_generate_report_agents_read_only',
    password: 'changeme',
  },
  fleet_agent_policies_read_only: {
    permissions: {
      feature: {
        fleetv2: ['agent_policies_read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agent_policies_read_only',
    password: 'changeme',
  },
  fleet_agent_policies_all_only: {
    permissions: {
      feature: {
        fleetv2: ['agent_policies_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agent_policies_all_only',
    password: 'changeme',
  },
  fleet_agent_policies_all_and_agents_all_only: {
    permissions: {
      feature: {
        fleetv2: ['agent_policies_all', 'agents_all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_agent_policies_all_and_agents_allonly',
    password: 'changeme',
  },
  setup: {
    permissions: {
      feature: {
        fleetv2: ['all', 'setup'],
        fleet: ['all'],
      },
      spaces: ['*'],
    },
    username: 'setup',
    password: 'changeme',
  },
  fleet_no_access: {
    permissions: {
      feature: {
        dashboards: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_no_access',
    password: 'changeme',
  },
  fleet_all_only: {
    permissions: {
      feature: {
        fleetv2: ['all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_all_only',
    password: 'changeme',
  },
  fleet_all_int_read: {
    permissions: {
      feature: {
        fleetv2: ['all'],
        fleet: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_all_int_read',
    password: 'changeme',
  },
  integr_all_only: {
    permissions: {
      feature: {
        fleet: ['all'],
      },
      spaces: ['*'],
    },
    username: 'integr_all',
    password: 'changeme',
  },
};

export const setupTestUsers = async (security: SecurityService, spaceAwarenessEnabled = false) => {
  for (const roleName in testUsers) {
    if (!spaceAwarenessEnabled && roleName === 'fleet_all_int_all_default_space_only') {
      continue;
    }
    if (Object.hasOwn(testUsers, roleName)) {
      const user = testUsers[roleName];

      if (user.permissions) {
        await security.role.create(roleName, {
          kibana: [user.permissions],
        });
      }

      await security.user.create(user.username, {
        password: user.password,
        roles: [roleName],
        full_name: user.username,
      });
    }
  }
};
