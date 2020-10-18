/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/naming-convention */

/**
 * The fixtures below are from the "_nodes/settings" endpoint on a 7.9.2 Cloud-created cluster.
 */

export const cloudNodeSettingsWithLegacy = {
  _nodes: {
    successful: 5,
    failed: 0,
    total: 5,
  },
  cluster_name: '6ee9547c30214d278d2a63c4de98dea5',
  nodes: {
    t49k7mdeRIiELuOt_MOZ1g: {
      transport_address: '10.47.32.43:19833',
      name: 'instance-0000000002',
      roles: ['data', 'ingest', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000002.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-c',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highstorage.1',
            logical_availability_zone: 'zone-0',
            data: 'warm',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000002',
          master: 'false',
          data: 'true',
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18120',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18120',
        },
        network: {
          publish_host: '10.47.32.43',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19833',
          },
          profiles: {
            client: {
              port: '20296',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.32.43',
      host: '10.47.32.43',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000002.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-c',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highstorage.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-0',
        data: 'warm',
      },
      build_type: 'docker',
    },
    'SgaCpsXAQu-oTsP4iLGZWw': {
      transport_address: '10.47.32.33:19227',
      name: 'tiebreaker-0000000004',
      roles: ['master', 'remote_cluster_client', 'voting_only'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'tiebreaker-0000000004.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-b',
            region: 'unknown-region',
            transform: {
              node: 'false',
            },
            instance_configuration: 'gcp.master.1',
            logical_availability_zone: 'tiebreaker',
            data: 'hot',
          },
          ml: 'false',
          ingest: 'false',
          name: 'tiebreaker-0000000004',
          master: 'true',
          voting_only: 'true',
          data: 'false',
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18013',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18013',
        },
        network: {
          publish_host: '10.47.32.33',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19227',
          },
          profiles: {
            client: {
              port: '20281',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.32.33',
      host: '10.47.32.33',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'tiebreaker-0000000004.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-b',
        'transform.node': 'false',
        region: 'unknown-region',
        instance_configuration: 'gcp.master.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'tiebreaker',
        data: 'hot',
      },
      build_type: 'docker',
    },
    'ZVndRfrfSl-kmEyZgJu0JQ': {
      transport_address: '10.47.47.205:19570',
      name: 'instance-0000000001',
      roles: ['data', 'ingest', 'master', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000001.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-a',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highio.1',
            logical_availability_zone: 'zone-1',
            data: 'hot',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000001',
          master: 'true',
          data: 'true',
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18760',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18760',
        },
        network: {
          publish_host: '10.47.47.205',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19570',
          },
          profiles: {
            client: {
              port: '20803',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.47.205',
      host: '10.47.47.205',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000001.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-a',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highio.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-1',
        data: 'hot',
      },
      build_type: 'docker',
    },
    Tx8Xig60SIuitXhY0srD6Q: {
      transport_address: '10.47.32.41:19901',
      name: 'instance-0000000003',
      roles: ['data', 'ingest', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000003.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-a',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highstorage.1',
            logical_availability_zone: 'zone-1',
            data: 'warm',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000003',
          master: 'false',
          data: 'true',
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18977',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18977',
        },
        network: {
          publish_host: '10.47.32.41',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19901',
          },
          profiles: {
            client: {
              port: '20466',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.32.41',
      host: '10.47.32.41',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000003.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-a',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highstorage.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-1',
        data: 'warm',
      },
      build_type: 'docker',
    },
    Qtpmy7aBSIaOZisv9Q92TA: {
      transport_address: '10.47.47.203:19498',
      name: 'instance-0000000000',
      roles: ['data', 'ingest', 'master', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000000.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-c',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highio.1',
            logical_availability_zone: 'zone-0',
            data: 'hot',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000000',
          master: 'true',
          data: 'true',
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18221',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18221',
        },
        network: {
          publish_host: '10.47.47.203',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19498',
          },
          profiles: {
            client: {
              port: '20535',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.47.203',
      host: '10.47.47.203',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000000.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-c',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highio.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-0',
        data: 'hot',
      },
      build_type: 'docker',
    },
  },
};

export const cloudNodeSettingsWithoutLegacy = {
  _nodes: {
    successful: 5,
    failed: 0,
    total: 5,
  },
  cluster_name: '6ee9547c30214d278d2a63c4de98dea5',
  nodes: {
    t49k7mdeRIiELuOt_MOZ1g: {
      transport_address: '10.47.32.43:19833',
      name: 'instance-0000000002',
      roles: ['data', 'ingest', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000002.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-c',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highstorage.1',
            logical_availability_zone: 'zone-0',
            data: 'warm',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000002',
          master: 'false',
          data: undefined,
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18120',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18120',
        },
        network: {
          publish_host: '10.47.32.43',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19833',
          },
          profiles: {
            client: {
              port: '20296',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.32.43',
      host: '10.47.32.43',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000002.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-c',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highstorage.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-0',
        data: 'warm',
      },
      build_type: 'docker',
    },
    'SgaCpsXAQu-oTsP4iLGZWw': {
      transport_address: '10.47.32.33:19227',
      name: 'tiebreaker-0000000004',
      roles: ['master', 'remote_cluster_client', 'voting_only'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'tiebreaker-0000000004.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-b',
            region: 'unknown-region',
            transform: {
              node: 'false',
            },
            instance_configuration: 'gcp.master.1',
            logical_availability_zone: 'tiebreaker',
            data: 'hot',
          },
          ml: 'false',
          ingest: 'false',
          name: 'tiebreaker-0000000004',
          master: 'true',
          voting_only: 'true',
          data: 'false',
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18013',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18013',
        },
        network: {
          publish_host: '10.47.32.33',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19227',
          },
          profiles: {
            client: {
              port: '20281',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.32.33',
      host: '10.47.32.33',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'tiebreaker-0000000004.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-b',
        'transform.node': 'false',
        region: 'unknown-region',
        instance_configuration: 'gcp.master.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'tiebreaker',
        data: 'hot',
      },
      build_type: 'docker',
    },
    'ZVndRfrfSl-kmEyZgJu0JQ': {
      transport_address: '10.47.47.205:19570',
      name: 'instance-0000000001',
      roles: ['data', 'ingest', 'master', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000001.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-a',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highio.1',
            logical_availability_zone: 'zone-1',
            data: 'hot',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000001',
          master: 'true',
          data: undefined,
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18760',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18760',
        },
        network: {
          publish_host: '10.47.47.205',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19570',
          },
          profiles: {
            client: {
              port: '20803',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.47.205',
      host: '10.47.47.205',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000001.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-a',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highio.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-1',
        data: 'hot',
      },
      build_type: 'docker',
    },
    Tx8Xig60SIuitXhY0srD6Q: {
      transport_address: '10.47.32.41:19901',
      name: 'instance-0000000003',
      roles: ['data', 'ingest', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000003.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-a',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highstorage.1',
            logical_availability_zone: 'zone-1',
            data: 'warm',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000003',
          master: 'false',
          data: undefined,
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18977',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18977',
        },
        network: {
          publish_host: '10.47.32.41',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19901',
          },
          profiles: {
            client: {
              port: '20466',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.32.41',
      host: '10.47.32.41',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000003.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-a',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highstorage.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-1',
        data: 'warm',
      },
      build_type: 'docker',
    },
    Qtpmy7aBSIaOZisv9Q92TA: {
      transport_address: '10.47.47.203:19498',
      name: 'instance-0000000000',
      roles: ['data', 'ingest', 'master', 'remote_cluster_client', 'transform'],
      settings: {
        node: {
          attr: {
            xpack: {
              installed: 'true',
            },
            server_name: 'instance-0000000000.6ee9547c30214d278d2a63c4de98dea5',
            availability_zone: 'europe-west4-c',
            region: 'unknown-region',
            transform: {
              node: 'true',
            },
            instance_configuration: 'gcp.data.highio.1',
            logical_availability_zone: 'zone-0',
            data: 'hot',
          },
          ml: 'false',
          ingest: 'true',
          name: 'instance-0000000000',
          master: 'true',
          data: undefined,
          pidfile: '/app/es.pid',
          max_local_storage_nodes: '1',
        },
        reindex: {
          remote: {
            whitelist: ['*.io:*', '*.com:*'],
          },
        },
        http: {
          compression: 'true',
          type: 'security4',
          max_warning_header_count: '64',
          publish_port: '18221',
          'type.default': 'netty4',
          max_warning_header_size: '7168b',
          port: '18221',
        },
        network: {
          publish_host: '10.47.47.203',
          bind_host: '_site:ipv4_',
        },
        xpack: {
          monitoring: {
            collection: {
              enabled: 'false',
            },
            history: {
              duration: '3d',
            },
          },
          license: {
            self_generated: {
              type: 'trial',
            },
          },
          ml: {
            enabled: 'true',
          },
          ccr: {
            enabled: 'false',
          },
          notification: {
            email: {
              account: {
                work: {
                  email_defaults: {
                    from: 'Watcher Alert <noreply@watcheralert.found.io>',
                  },
                  smtp: {
                    host: 'dockerhost',
                    port: '10025',
                  },
                },
              },
            },
          },
          security: {
            authc: {
              token: {
                enabled: 'true',
              },
              reserved_realm: {
                enabled: 'false',
              },
              realms: {
                native: {
                  native: {
                    order: '1',
                  },
                },
                file: {
                  found: {
                    order: '0',
                  },
                },
                saml: {
                  'cloud-saml-kibana-916c269173df465f9826f4471799de42': {
                    attributes: {
                      name: 'http://saml.elastic-cloud.com/attributes/name',
                      groups: 'http://saml.elastic-cloud.com/attributes/roles',
                      principal: 'http://saml.elastic-cloud.com/attributes/principal',
                    },
                    sp: {
                      acs:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/api/security/saml/callback',
                      entity_id: 'ec:2628060457:916c269173df465f9826f4471799de42',
                      logout:
                        'https://916c269173df465f9826f4471799de42.europe-west4.gcp.elastic-cloud.com:9243/logout',
                    },
                    order: '3',
                    idp: {
                      entity_id: 'urn:idp-cloud-elastic-co',
                      metadata: {
                        path:
                          '/app/config/cloud-saml-metadata-916c269173df465f9826f4471799de42.xml',
                      },
                    },
                  },
                },
              },
              anonymous: {
                username: 'anonymous',
                authz_exception: 'false',
                roles: 'anonymous',
              },
            },
            enabled: 'true',
            http: {
              ssl: {
                enabled: 'true',
              },
            },
            transport: {
              ssl: {
                enabled: 'true',
              },
            },
          },
        },
        script: {
          allowed_types: 'stored,inline',
        },
        cluster: {
          routing: {
            allocation: {
              disk: {
                threshold_enabled: 'true',
                watermark: {
                  enable_for_single_data_node: 'true',
                },
              },
              awareness: {
                attributes: 'region,logical_availability_zone',
              },
            },
          },
          name: '6ee9547c30214d278d2a63c4de98dea5',
          initial_master_nodes: 'instance-0000000000,instance-0000000001,tiebreaker-0000000004',
          election: {
            strategy: 'supports_voting_only',
          },
          indices: {
            close: {
              enable: 'true',
            },
          },
          metadata: {
            managed_policies: ['cloud-snapshot-policy'],
            managed_repository: 'found-snapshots',
            managed_index_templates: '.cloud-',
          },
        },
        client: {
          type: 'node',
        },
        action: {
          auto_create_index: 'true',
          destructive_requires_name: 'false',
        },
        path: {
          home: '/usr/share/elasticsearch',
          data: ['/app/data'],
          logs: '/app/logs',
        },
        transport: {
          'type.default': 'netty4',
          type: 'security4',
          tcp: {
            port: '19498',
          },
          profiles: {
            client: {
              port: '20535',
            },
          },
          features: {
            'x-pack': 'true',
          },
        },
        discovery: {
          seed_hosts: [],
          seed_providers: 'file',
        },
      },
      ip: '10.47.47.203',
      host: '10.47.47.203',
      version: '7.9.2',
      build_flavor: 'default',
      build_hash: 'd34da0ea4a966c4e49417f2da2f244e3e97b4e6e',
      attributes: {
        server_name: 'instance-0000000000.6ee9547c30214d278d2a63c4de98dea5',
        availability_zone: 'europe-west4-c',
        'transform.node': 'true',
        region: 'unknown-region',
        instance_configuration: 'gcp.data.highio.1',
        'xpack.installed': 'true',
        logical_availability_zone: 'zone-0',
        data: 'hot',
      },
      build_type: 'docker',
    },
  },
};
