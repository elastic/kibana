/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_POLICY_MAPPINGS = {
  properties: {
    name: { type: 'keyword' },
    schema_version: { type: 'version' },
    description: { type: 'text' },
    namespace: { type: 'keyword' },
    is_managed: { type: 'boolean' },
    is_default: { type: 'boolean' },
    is_default_fleet_server: { type: 'boolean' },
    status: { type: 'keyword' },
    unenroll_timeout: { type: 'integer' },
    inactivity_timeout: { type: 'integer' },
    updated_at: { type: 'date' },
    updated_by: { type: 'keyword' },
    revision: { type: 'integer' },
    monitoring_enabled: { type: 'keyword', index: false },
    is_preconfigured: { type: 'keyword' },
    data_output_id: { type: 'keyword' },
    monitoring_output_id: { type: 'keyword' },
    download_source_id: { type: 'keyword' },
    fleet_server_host_id: { type: 'keyword' },
    agent_features: {
      properties: {
        name: { type: 'keyword' },
        enabled: { type: 'boolean' },
      },
    },
    is_protected: { type: 'boolean' },
    overrides: { type: 'flattened', index: false },
  },
} as const;

export const PACKAGE_POLICIES_MAPPINGS = {
  properties: {
    name: { type: 'keyword' },
    description: { type: 'text' },
    namespace: { type: 'keyword' },
    enabled: { type: 'boolean' },
    is_managed: { type: 'boolean' },
    policy_id: { type: 'keyword' },
    package: {
      properties: {
        name: { type: 'keyword' },
        title: { type: 'keyword' },
        version: { type: 'keyword' },
      },
    },
    elasticsearch: {
      dynamic: false,
      properties: {},
    },
    vars: { type: 'flattened' },
    inputs: {
      dynamic: false,
      properties: {},
    },
    secret_references: { properties: { id: { type: 'keyword' } } },
    revision: { type: 'integer' },
    updated_at: { type: 'date' },
    updated_by: { type: 'keyword' },
    created_at: { type: 'date' },
    created_by: { type: 'keyword' },
  },
} as const;

export const AGENT_MAPPINGS = {
  properties: {
    access_api_key_id: {
      type: 'keyword',
    },
    action_seq_no: {
      type: 'integer',
      index: false,
    },
    active: {
      type: 'boolean',
    },
    agent: {
      properties: {
        id: {
          type: 'keyword',
        },
        version: {
          type: 'keyword',
        },
      },
    },
    default_api_key: {
      type: 'keyword',
    },
    default_api_key_id: {
      type: 'keyword',
    },
    enrolled_at: {
      type: 'date',
    },
    enrollment_id: {
      type: 'keyword',
    },
    last_checkin: {
      type: 'date',
    },
    last_checkin_message: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    last_checkin_status: {
      type: 'keyword',
    },
    last_updated: {
      type: 'date',
    },
    local_metadata: {
      properties: {
        elastic: {
          properties: {
            agent: {
              properties: {
                build: {
                  properties: {
                    original: {
                      type: 'text',
                      fields: {
                        keyword: {
                          type: 'keyword',
                          ignore_above: 256,
                        },
                      },
                    },
                  },
                },
                id: {
                  type: 'keyword',
                },
                log_level: {
                  type: 'keyword',
                },
                snapshot: {
                  type: 'boolean',
                },
                upgradeable: {
                  type: 'boolean',
                },
                version: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 16,
                    },
                  },
                },
              },
            },
          },
        },
        host: {
          properties: {
            architecture: {
              type: 'keyword',
            },
            hostname: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            id: {
              type: 'keyword',
            },
            ip: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 64,
                },
              },
            },
            mac: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 17,
                },
              },
            },
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
        os: {
          properties: {
            family: {
              type: 'keyword',
            },
            full: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 128,
                },
              },
            },
            kernel: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 128,
                },
              },
            },
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            platform: {
              type: 'keyword',
            },
            version: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 32,
                },
              },
            },
          },
        },
      },
    },
    packages: {
      type: 'keyword',
    },
    policy_coordinator_idx: {
      type: 'integer',
    },
    policy_id: {
      type: 'keyword',
    },
    policy_revision_idx: {
      type: 'integer',
    },
    policy_output_permissions_hash: {
      type: 'keyword',
    },
    shared_id: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
    },
    unenrolled_at: {
      type: 'date',
    },
    unenrollment_started_at: {
      type: 'date',
    },
    updated_at: {
      type: 'date',
    },
    upgrade_started_at: {
      type: 'date',
    },
    upgraded_at: {
      type: 'date',
    },
    tags: {
      type: 'keyword',
    },
    // added to allow validation on status field
    status: {
      type: 'keyword',
    },
  },
} as const;

export const ENROLLMENT_API_KEY_MAPPINGS = {
  properties: {
    active: {
      type: 'boolean',
    },
    api_key: {
      type: 'keyword',
    },
    api_key_id: {
      type: 'keyword',
    },
    created_at: {
      type: 'date',
    },
    expire_at: {
      type: 'date',
    },
    name: {
      type: 'keyword',
    },
    policy_id: {
      type: 'keyword',
    },
    updated_at: {
      type: 'date',
    },
  },
} as const;
