/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

export const logs: Record<string, IndicesGetMappingIndexMappingRecord> = {
  '.ds-logs-endpoint.events.process-default-2022.09.27-000001': {
    mappings: {
      dynamic: 'false',
      _meta: {
        package: {
          name: 'endpoint',
        },
        managed_by: 'fleet',
        managed: true,
      },
      _data_stream_timestamp: {
        enabled: true,
      },
      dynamic_templates: [
        {
          strings_as_keyword: {
            match_mapping_type: 'string',
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
      ],
      date_detection: false,
      properties: {
        '@timestamp': {
          type: 'date',
        },
        agent: {
          properties: {
            ephemeral_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        cloud: {
          properties: {
            account: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            instance: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            project: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            provider: {
              type: 'keyword',
              ignore_above: 1024,
            },
            region: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        container: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            image: {
              properties: {
                hash: {
                  properties: {
                    all: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                tag: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        data_stream: {
          properties: {
            dataset: {
              type: 'constant_keyword',
              value: 'endpoint.events.process',
            },
            namespace: {
              type: 'constant_keyword',
              value: 'default',
            },
            type: {
              type: 'constant_keyword',
              value: 'logs',
            },
          },
        },
        destination: {
          properties: {
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                postal_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                timezone: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        ecs: {
          properties: {
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        event: {
          properties: {
            action: {
              type: 'keyword',
              ignore_above: 1024,
            },
            agent_id_status: {
              type: 'keyword',
              ignore_above: 1024,
            },
            category: {
              type: 'keyword',
              ignore_above: 1024,
            },
            code: {
              type: 'keyword',
              ignore_above: 1024,
            },
            created: {
              type: 'date',
            },
            dataset: {
              type: 'keyword',
              ignore_above: 1024,
            },
            hash: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            ingested: {
              type: 'date',
              format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
            },
            kind: {
              type: 'keyword',
              ignore_above: 1024,
            },
            module: {
              type: 'keyword',
              ignore_above: 1024,
            },
            outcome: {
              type: 'keyword',
              ignore_above: 1024,
            },
            provider: {
              type: 'keyword',
              ignore_above: 1024,
            },
            sequence: {
              type: 'long',
            },
            severity: {
              type: 'long',
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        group: {
          properties: {
            Ext: {
              properties: {
                real: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        host: {
          properties: {
            architecture: {
              type: 'keyword',
              ignore_above: 1024,
            },
            boot: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            hostname: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            os: {
              properties: {
                Ext: {
                  properties: {
                    variant: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                family: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                full: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                kernel: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                platform: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            pid_ns_ino: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            uptime: {
              type: 'long',
            },
          },
        },
        message: {
          type: 'match_only_text',
        },
        orchestrator: {
          properties: {
            cluster: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            namespace: {
              type: 'keyword',
              ignore_above: 1024,
            },
            resource: {
              properties: {
                ip: {
                  type: 'ip',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                parent: {
                  properties: {
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        package: {
          properties: {
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        process: {
          properties: {
            Ext: {
              properties: {
                ancestry: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                architecture: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                authentication_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                code_signature: {
                  type: 'nested',
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                defense_evasions: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                device: {
                  properties: {
                    bus_type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    dos_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    nt_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    product_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    serial_number: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    vendor_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    volume_device_type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                dll: {
                  properties: {
                    Ext: {
                      properties: {
                        mapped_address: {
                          type: 'unsigned_long',
                        },
                        mapped_size: {
                          type: 'unsigned_long',
                        },
                      },
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                effective_parent: {
                  properties: {
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    executable: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pid: {
                      type: 'long',
                    },
                  },
                },
                protection: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                relative_file_creation_time: {
                  type: 'double',
                },
                relative_file_name_modify_time: {
                  type: 'double',
                },
                session: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                token: {
                  properties: {
                    elevation: {
                      type: 'boolean',
                    },
                    elevation_level: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    elevation_type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    integrity_level_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    security_attributes: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                trusted: {
                  type: 'boolean',
                },
                trusted_descendant: {
                  type: 'boolean',
                },
              },
            },
            args: {
              type: 'keyword',
              ignore_above: 1024,
            },
            args_count: {
              type: 'long',
            },
            code_signature: {
              properties: {
                exists: {
                  type: 'boolean',
                },
                signing_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                status: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                subject_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                team_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                trusted: {
                  type: 'boolean',
                },
                valid: {
                  type: 'boolean',
                },
              },
            },
            command_line: {
              type: 'wildcard',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            end: {
              type: 'date',
            },
            entity_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            entry_leader: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                attested_groups: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                attested_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                entry_meta: {
                  properties: {
                    source: {
                      properties: {
                        ip: {
                          type: 'ip',
                        },
                      },
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                parent: {
                  properties: {
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pid: {
                      type: 'long',
                    },
                    session_leader: {
                      properties: {
                        entity_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        pid: {
                          type: 'long',
                        },
                        start: {
                          type: 'date',
                        },
                      },
                    },
                    start: {
                      type: 'date',
                    },
                  },
                },
                pid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                same_as_process: {
                  type: 'boolean',
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            env_vars: {
              type: 'object',
            },
            executable: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            exit_code: {
              type: 'long',
            },
            group: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            group_leader: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                pid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                same_as_process: {
                  type: 'boolean',
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            hash: {
              properties: {
                md5: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha1: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha256: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha512: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            interactive: {
              type: 'boolean',
            },
            io: {
              properties: {
                max_bytes_per_process_exceeded: {
                  type: 'boolean',
                },
                text: {
                  type: 'wildcard',
                  ignore_above: 1024,
                },
                total_bytes_captured: {
                  type: 'long',
                },
                total_bytes_skipped: {
                  type: 'long',
                },
              },
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            parent: {
              properties: {
                Ext: {
                  properties: {
                    architecture: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    code_signature: {
                      type: 'nested',
                      properties: {
                        exists: {
                          type: 'boolean',
                        },
                        status: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        trusted: {
                          type: 'boolean',
                        },
                        valid: {
                          type: 'boolean',
                        },
                      },
                    },
                    protection: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    real: {
                      properties: {
                        pid: {
                          type: 'long',
                        },
                      },
                    },
                    user: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                code_signature: {
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    signing_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    team_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                exit_code: {
                  type: 'long',
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                group_leader: {
                  properties: {
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pid: {
                      type: 'long',
                    },
                    start: {
                      type: 'date',
                    },
                  },
                },
                hash: {
                  properties: {
                    md5: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha1: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha256: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha512: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                pe: {
                  properties: {
                    company: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    description: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    file_version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    imphash: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    original_file_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    product: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                pgid: {
                  type: 'long',
                },
                pid: {
                  type: 'long',
                },
                ppid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                thread: {
                  properties: {
                    id: {
                      type: 'long',
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                title: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                uptime: {
                  type: 'long',
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            pe: {
              properties: {
                company: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                description: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                file_version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                imphash: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                original_file_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                product: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            pgid: {
              type: 'long',
            },
            pid: {
              type: 'long',
            },
            ppid: {
              type: 'long',
            },
            previous: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            real_group: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            real_user: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
              },
            },
            saved_group: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            saved_user: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
              },
            },
            session_leader: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                parent: {
                  properties: {
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pid: {
                      type: 'long',
                    },
                    session_leader: {
                      properties: {
                        entity_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        pid: {
                          type: 'long',
                        },
                        start: {
                          type: 'date',
                        },
                      },
                    },
                    start: {
                      type: 'date',
                    },
                  },
                },
                pid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                same_as_process: {
                  type: 'boolean',
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            start: {
              type: 'date',
            },
            supplemental_groups: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            thread: {
              properties: {
                id: {
                  type: 'long',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            title: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
            },
            tty: {
              properties: {
                char_device: {
                  properties: {
                    major: {
                      type: 'long',
                    },
                    minor: {
                      type: 'long',
                    },
                  },
                },
                columns: {
                  type: 'long',
                },
                rows: {
                  type: 'long',
                },
              },
            },
            uptime: {
              type: 'long',
            },
            user: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
              },
            },
            working_directory: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
          },
        },
        source: {
          properties: {
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                postal_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                timezone: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        user: {
          properties: {
            Ext: {
              properties: {
                real: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            email: {
              type: 'keyword',
              ignore_above: 1024,
            },
            full_name: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
            },
            group: {
              properties: {
                Ext: {
                  properties: {
                    real: {
                      properties: {
                        id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                  },
                },
                domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            hash: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
            },
          },
        },
      },
    },
  },
  '.ds-logs-endpoint.alerts-default-2022.09.27-000001': {
    mappings: {
      dynamic: 'false',
      _meta: {
        package: {
          name: 'endpoint',
        },
        managed_by: 'fleet',
        managed: true,
      },
      _data_stream_timestamp: {
        enabled: true,
      },
      dynamic_templates: [
        {
          strings_as_keyword: {
            match_mapping_type: 'string',
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
      ],
      date_detection: false,
      properties: {
        '@timestamp': {
          type: 'date',
        },
        Endpoint: {
          properties: {
            policy: {
              properties: {
                applied: {
                  properties: {
                    artifacts: {
                      enabled: false,
                      properties: {
                        global: {
                          properties: {
                            identifiers: {
                              type: 'nested',
                              properties: {
                                name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                sha256: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        user: {
                          properties: {
                            identifiers: {
                              type: 'nested',
                              properties: {
                                name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                sha256: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
          },
        },
        Events: {
          type: 'object',
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Memory_protection: {
          properties: {
            cross_session: {
              type: 'boolean',
            },
            feature: {
              type: 'keyword',
              ignore_above: 1024,
            },
            parent_to_child: {
              type: 'boolean',
            },
            self_injection: {
              type: 'boolean',
            },
            thread_count: {
              type: 'long',
            },
            unique_key_v1: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        Ransomware: {
          properties: {
            child_processes: {
              properties: {
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                    },
                  },
                },
                feature: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                files: {
                  type: 'nested',
                  properties: {
                    data: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    entropy: {
                      type: 'double',
                    },
                    extension: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    metrics: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    operation: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    original: {
                      properties: {
                        extension: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    score: {
                      type: 'double',
                    },
                  },
                },
                pid: {
                  type: 'long',
                },
                score: {
                  type: 'double',
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            executable: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                text: {
                  type: 'text',
                },
              },
            },
            feature: {
              type: 'keyword',
              ignore_above: 1024,
            },
            files: {
              type: 'nested',
              properties: {
                data: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                entropy: {
                  type: 'double',
                },
                extension: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                metrics: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                operation: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                original: {
                  properties: {
                    extension: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                path: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                score: {
                  type: 'double',
                },
              },
            },
            pid: {
              type: 'long',
            },
            score: {
              type: 'double',
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        Responses: {
          properties: {
            '@timestamp': {
              type: 'date',
            },
            action: {
              type: 'nested',
              properties: {
                action: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                field: {
                  type: 'text',
                },
                file: {
                  properties: {
                    attributes: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                source: {
                  properties: {
                    attributes: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                state: {
                  type: 'long',
                },
                tree: {
                  type: 'boolean',
                },
              },
            },
            message: {
              type: 'text',
            },
            process: {
              type: 'nested',
              properties: {
                entity_id: {
                  type: 'text',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                pid: {
                  type: 'long',
                },
              },
            },
            result: {
              type: 'long',
            },
          },
        },
        Target: {
          properties: {
            dll: {
              properties: {
                Ext: {
                  properties: {
                    code_signature: {
                      type: 'nested',
                      properties: {
                        exists: {
                          type: 'boolean',
                        },
                        status: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        trusted: {
                          type: 'boolean',
                        },
                        valid: {
                          type: 'boolean',
                        },
                      },
                    },
                    compile_time: {
                      type: 'date',
                    },
                    malware_classification: {
                      properties: {
                        features: {
                          enabled: false,
                          properties: {
                            data: {
                              properties: {
                                buffer: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                decompressed_size: {
                                  type: 'long',
                                },
                                encoding: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                          },
                        },
                        identifier: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        score: {
                          type: 'double',
                        },
                        threshold: {
                          type: 'double',
                        },
                        upx_packed: {
                          type: 'boolean',
                        },
                        version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    mapped_address: {
                      type: 'unsigned_long',
                    },
                    mapped_size: {
                      type: 'unsigned_long',
                    },
                  },
                },
                code_signature: {
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    signing_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    team_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                hash: {
                  properties: {
                    md5: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha1: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha256: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha512: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                path: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                pe: {
                  properties: {
                    company: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    description: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    file_version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    imphash: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    original_file_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    product: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            process: {
              properties: {
                Ext: {
                  properties: {
                    ancestry: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    architecture: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    authentication_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    code_signature: {
                      type: 'nested',
                      properties: {
                        exists: {
                          type: 'boolean',
                        },
                        status: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        trusted: {
                          type: 'boolean',
                        },
                        valid: {
                          type: 'boolean',
                        },
                      },
                    },
                    dll: {
                      properties: {
                        Ext: {
                          properties: {
                            code_signature: {
                              type: 'nested',
                              properties: {
                                exists: {
                                  type: 'boolean',
                                },
                                status: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                subject_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                trusted: {
                                  type: 'boolean',
                                },
                                valid: {
                                  type: 'boolean',
                                },
                              },
                            },
                            compile_time: {
                              type: 'date',
                            },
                            mapped_address: {
                              type: 'unsigned_long',
                            },
                            mapped_size: {
                              type: 'unsigned_long',
                            },
                          },
                        },
                        code_signature: {
                          properties: {
                            exists: {
                              type: 'boolean',
                            },
                            signing_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            status: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            subject_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            team_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            trusted: {
                              type: 'boolean',
                            },
                            valid: {
                              type: 'boolean',
                            },
                          },
                        },
                        hash: {
                          properties: {
                            md5: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha1: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha256: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha512: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        pe: {
                          properties: {
                            company: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            file_version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            imphash: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            original_file_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            product: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    malware_classification: {
                      properties: {
                        features: {
                          enabled: false,
                          properties: {
                            data: {
                              properties: {
                                buffer: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                decompressed_size: {
                                  type: 'long',
                                },
                                encoding: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                          },
                        },
                        identifier: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        score: {
                          type: 'double',
                        },
                        threshold: {
                          type: 'double',
                        },
                        upx_packed: {
                          type: 'boolean',
                        },
                        version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    memory_region: {
                      properties: {
                        allocation_base: {
                          type: 'unsigned_long',
                        },
                        allocation_protection: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        allocation_size: {
                          type: 'unsigned_long',
                        },
                        allocation_type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        bytes_address: {
                          type: 'unsigned_long',
                        },
                        bytes_allocation_offset: {
                          type: 'unsigned_long',
                        },
                        bytes_compressed: {
                          type: 'keyword',
                          index: false,
                          doc_values: false,
                        },
                        bytes_compressed_present: {
                          type: 'boolean',
                        },
                        malware_signature: {
                          properties: {
                            all_names: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            identifier: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            primary: {
                              properties: {
                                matches: {
                                  type: 'keyword',
                                  index: false,
                                  doc_values: false,
                                },
                                signature: {
                                  properties: {
                                    hash: {
                                      type: 'nested',
                                      properties: {
                                        sha256: {
                                          type: 'keyword',
                                          ignore_above: 1024,
                                        },
                                      },
                                    },
                                    id: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                    name: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                  },
                                },
                              },
                            },
                            version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        mapped_path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        mapped_pe: {
                          properties: {
                            company: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            file_version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            imphash: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            original_file_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            product: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        mapped_pe_detected: {
                          type: 'boolean',
                        },
                        memory_pe: {
                          properties: {
                            company: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            file_version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            imphash: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            original_file_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            product: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        memory_pe_detected: {
                          type: 'boolean',
                        },
                        region_base: {
                          type: 'unsigned_long',
                        },
                        region_protection: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        region_size: {
                          type: 'unsigned_long',
                        },
                        region_state: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        strings: {
                          type: 'keyword',
                          index: false,
                          doc_values: false,
                        },
                      },
                    },
                    protection: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    services: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    session: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    token: {
                      properties: {
                        domain: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        elevation: {
                          type: 'boolean',
                        },
                        elevation_type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        impersonation_level: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        integrity_level: {
                          type: 'long',
                        },
                        integrity_level_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        is_appcontainer: {
                          type: 'boolean',
                        },
                        privileges: {
                          type: 'nested',
                          properties: {
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            enabled: {
                              type: 'boolean',
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        sid: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        user: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    user: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                code_signature: {
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    signing_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    team_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                exit_code: {
                  type: 'long',
                },
                hash: {
                  properties: {
                    md5: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha1: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha256: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha512: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                parent: {
                  properties: {
                    Ext: {
                      properties: {
                        architecture: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        code_signature: {
                          type: 'nested',
                          properties: {
                            exists: {
                              type: 'boolean',
                            },
                            status: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            subject_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            trusted: {
                              type: 'boolean',
                            },
                            valid: {
                              type: 'boolean',
                            },
                          },
                        },
                        dll: {
                          properties: {
                            Ext: {
                              properties: {
                                code_signature: {
                                  type: 'nested',
                                  properties: {
                                    exists: {
                                      type: 'boolean',
                                    },
                                    status: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                    subject_name: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                    trusted: {
                                      type: 'boolean',
                                    },
                                    valid: {
                                      type: 'boolean',
                                    },
                                  },
                                },
                                compile_time: {
                                  type: 'date',
                                },
                                mapped_address: {
                                  type: 'unsigned_long',
                                },
                                mapped_size: {
                                  type: 'unsigned_long',
                                },
                              },
                            },
                            code_signature: {
                              properties: {
                                exists: {
                                  type: 'boolean',
                                },
                                signing_id: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                status: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                subject_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                team_id: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                trusted: {
                                  type: 'boolean',
                                },
                                valid: {
                                  type: 'boolean',
                                },
                              },
                            },
                            hash: {
                              properties: {
                                md5: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                sha1: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                sha256: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                sha512: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            path: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            pe: {
                              properties: {
                                company: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                description: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                file_version: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                imphash: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                original_file_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                product: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                          },
                        },
                        protection: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        real: {
                          properties: {
                            pid: {
                              type: 'long',
                            },
                          },
                        },
                        token: {
                          properties: {
                            domain: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            elevation: {
                              type: 'boolean',
                            },
                            elevation_type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            impersonation_level: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            integrity_level: {
                              type: 'long',
                            },
                            integrity_level_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            is_appcontainer: {
                              type: 'boolean',
                            },
                            privileges: {
                              type: 'nested',
                              properties: {
                                description: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                enabled: {
                                  type: 'boolean',
                                },
                                name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            sid: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            user: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        user: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    args: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    args_count: {
                      type: 'long',
                    },
                    code_signature: {
                      properties: {
                        exists: {
                          type: 'boolean',
                        },
                        signing_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        status: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        team_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        trusted: {
                          type: 'boolean',
                        },
                        valid: {
                          type: 'boolean',
                        },
                      },
                    },
                    command_line: {
                      type: 'wildcard',
                      ignore_above: 1024,
                      fields: {
                        caseless: {
                          type: 'keyword',
                          ignore_above: 1024,
                          normalizer: 'lowercase',
                        },
                        text: {
                          type: 'text',
                        },
                      },
                    },
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    executable: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        caseless: {
                          type: 'keyword',
                          ignore_above: 1024,
                          normalizer: 'lowercase',
                        },
                        text: {
                          type: 'text',
                        },
                      },
                    },
                    exit_code: {
                      type: 'long',
                    },
                    hash: {
                      properties: {
                        md5: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha1: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha256: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha512: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        caseless: {
                          type: 'keyword',
                          ignore_above: 1024,
                          normalizer: 'lowercase',
                        },
                        text: {
                          type: 'text',
                        },
                      },
                    },
                    pe: {
                      properties: {
                        company: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        description: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        file_version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        imphash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        original_file_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        product: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    pgid: {
                      type: 'long',
                    },
                    pid: {
                      type: 'long',
                    },
                    ppid: {
                      type: 'long',
                    },
                    start: {
                      type: 'date',
                    },
                    thread: {
                      properties: {
                        id: {
                          type: 'long',
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    title: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                    uptime: {
                      type: 'long',
                    },
                    working_directory: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        caseless: {
                          type: 'keyword',
                          ignore_above: 1024,
                          normalizer: 'lowercase',
                        },
                        text: {
                          type: 'text',
                        },
                      },
                    },
                  },
                },
                pe: {
                  properties: {
                    company: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    description: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    file_version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    imphash: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    original_file_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    product: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                pgid: {
                  type: 'long',
                },
                pid: {
                  type: 'long',
                },
                ppid: {
                  type: 'long',
                },
                start: {
                  type: 'date',
                },
                thread: {
                  properties: {
                    Ext: {
                      properties: {
                        call_stack: {
                          enabled: false,
                          properties: {
                            instruction_pointer: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            memory_section: {
                              properties: {
                                memory_address: {
                                  type: 'keyword',
                                  index: false,
                                  doc_values: false,
                                },
                                memory_size: {
                                  type: 'keyword',
                                  index: false,
                                  doc_values: false,
                                },
                                protection: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            module_name: {
                              type: 'keyword',
                              index: false,
                              doc_values: false,
                            },
                            module_path: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            rva: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            symbol_info: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        call_stack_final_user_module: {
                          type: 'nested',
                          properties: {
                            code_signature: {
                              type: 'nested',
                              properties: {
                                exists: {
                                  type: 'boolean',
                                },
                                status: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                subject_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                trusted: {
                                  type: 'boolean',
                                },
                                valid: {
                                  type: 'boolean',
                                },
                              },
                            },
                            hash: {
                              properties: {
                                sha256: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            path: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        call_stack_summary: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        parameter: {
                          type: 'unsigned_long',
                        },
                        parameter_bytes_compressed: {
                          type: 'keyword',
                          index: false,
                          doc_values: false,
                        },
                        parameter_bytes_compressed_present: {
                          type: 'boolean',
                        },
                        service: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        start: {
                          type: 'date',
                        },
                        start_address: {
                          type: 'unsigned_long',
                        },
                        start_address_allocation_offset: {
                          type: 'unsigned_long',
                        },
                        start_address_bytes: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        start_address_bytes_disasm: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        start_address_bytes_disasm_hash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        start_address_module: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        token: {
                          properties: {
                            domain: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            elevation: {
                              type: 'boolean',
                            },
                            elevation_type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            impersonation_level: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            integrity_level: {
                              type: 'long',
                            },
                            integrity_level_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            is_appcontainer: {
                              type: 'boolean',
                            },
                            privileges: {
                              type: 'nested',
                              properties: {
                                description: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                enabled: {
                                  type: 'boolean',
                                },
                                name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            sid: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            user: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        uptime: {
                          type: 'long',
                        },
                      },
                    },
                    id: {
                      type: 'long',
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                title: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
                uptime: {
                  type: 'long',
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
          },
        },
        agent: {
          properties: {
            ephemeral_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        cloud: {
          properties: {
            account: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            instance: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            project: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            provider: {
              type: 'keyword',
              ignore_above: 1024,
            },
            region: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        container: {
          properties: {
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            image: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                tag: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        data_stream: {
          properties: {
            dataset: {
              type: 'constant_keyword',
              value: 'endpoint.alerts',
            },
            namespace: {
              type: 'constant_keyword',
              value: 'default',
            },
            type: {
              type: 'constant_keyword',
              value: 'logs',
            },
          },
        },
        destination: {
          properties: {
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                postal_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                timezone: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            ip: {
              type: 'ip',
            },
          },
        },
        dll: {
          properties: {
            Ext: {
              properties: {
                code_signature: {
                  type: 'nested',
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                compile_time: {
                  type: 'date',
                },
                malware_classification: {
                  properties: {
                    features: {
                      enabled: false,
                      properties: {
                        data: {
                          properties: {
                            buffer: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            decompressed_size: {
                              type: 'long',
                            },
                            encoding: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    identifier: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    score: {
                      type: 'double',
                    },
                    threshold: {
                      type: 'double',
                    },
                    upx_packed: {
                      type: 'boolean',
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                mapped_address: {
                  type: 'unsigned_long',
                },
                mapped_size: {
                  type: 'unsigned_long',
                },
              },
            },
            code_signature: {
              properties: {
                exists: {
                  type: 'boolean',
                },
                signing_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                status: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                subject_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                team_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                trusted: {
                  type: 'boolean',
                },
                valid: {
                  type: 'boolean',
                },
              },
            },
            hash: {
              properties: {
                md5: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha1: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha256: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha512: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            path: {
              type: 'keyword',
              ignore_above: 1024,
            },
            pe: {
              properties: {
                company: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                description: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                file_version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                imphash: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                original_file_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                product: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        dns: {
          properties: {
            question: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        ecs: {
          properties: {
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        elastic: {
          properties: {
            agent: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        event: {
          properties: {
            action: {
              type: 'keyword',
              ignore_above: 1024,
            },
            agent_id_status: {
              type: 'keyword',
              ignore_above: 1024,
            },
            category: {
              type: 'keyword',
              ignore_above: 1024,
            },
            code: {
              type: 'keyword',
              ignore_above: 1024,
            },
            created: {
              type: 'date',
            },
            dataset: {
              type: 'keyword',
              ignore_above: 1024,
            },
            hash: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            ingested: {
              type: 'date',
              format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
            },
            kind: {
              type: 'keyword',
              ignore_above: 1024,
            },
            module: {
              type: 'keyword',
              ignore_above: 1024,
            },
            outcome: {
              type: 'keyword',
              ignore_above: 1024,
            },
            provider: {
              type: 'keyword',
              ignore_above: 1024,
            },
            risk_score: {
              type: 'float',
            },
            sequence: {
              type: 'long',
            },
            severity: {
              type: 'long',
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        file: {
          properties: {
            Ext: {
              properties: {
                code_signature: {
                  type: 'nested',
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                entry_modified: {
                  type: 'double',
                },
                macro: {
                  properties: {
                    code_page: {
                      type: 'long',
                    },
                    collection: {
                      properties: {
                        hash: {
                          properties: {
                            md5: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha1: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha256: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha512: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    errors: {
                      type: 'nested',
                      properties: {
                        count: {
                          type: 'long',
                        },
                        error_type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    file_extension: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    project_file: {
                      properties: {
                        hash: {
                          properties: {
                            md5: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha1: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha256: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha512: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    stream: {
                      type: 'nested',
                      properties: {
                        hash: {
                          properties: {
                            md5: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha1: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha256: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha512: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        raw_code: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        raw_code_size: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                  },
                },
                malware_classification: {
                  properties: {
                    features: {
                      enabled: false,
                      properties: {
                        data: {
                          properties: {
                            buffer: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            decompressed_size: {
                              type: 'long',
                            },
                            encoding: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    identifier: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    score: {
                      type: 'double',
                    },
                    threshold: {
                      type: 'double',
                    },
                    upx_packed: {
                      type: 'boolean',
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                original: {
                  properties: {
                    gid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    group: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    mode: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    owner: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    uid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                quarantine_message: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                quarantine_path: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                quarantine_result: {
                  type: 'boolean',
                },
                temp_file_path: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                windows: {
                  properties: {
                    zone_identifier: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            accessed: {
              type: 'date',
            },
            attributes: {
              type: 'keyword',
              ignore_above: 1024,
            },
            code_signature: {
              properties: {
                exists: {
                  type: 'boolean',
                },
                signing_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                status: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                subject_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                team_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                trusted: {
                  type: 'boolean',
                },
                valid: {
                  type: 'boolean',
                },
              },
            },
            created: {
              type: 'date',
            },
            ctime: {
              type: 'date',
            },
            device: {
              type: 'keyword',
              ignore_above: 1024,
            },
            directory: {
              type: 'keyword',
              ignore_above: 1024,
            },
            drive_letter: {
              type: 'keyword',
              ignore_above: 1,
            },
            extension: {
              type: 'keyword',
              ignore_above: 1024,
            },
            gid: {
              type: 'keyword',
              ignore_above: 1024,
            },
            group: {
              type: 'keyword',
              ignore_above: 1024,
            },
            hash: {
              properties: {
                md5: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha1: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha256: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha512: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            inode: {
              type: 'keyword',
              ignore_above: 1024,
            },
            mime_type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            mode: {
              type: 'keyword',
              ignore_above: 1024,
            },
            mtime: {
              type: 'date',
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            owner: {
              type: 'keyword',
              ignore_above: 1024,
            },
            path: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            pe: {
              properties: {
                company: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                description: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                file_version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                imphash: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                original_file_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                product: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            size: {
              type: 'long',
            },
            target_path: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            uid: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        group: {
          properties: {
            Ext: {
              properties: {
                real: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        host: {
          properties: {
            architecture: {
              type: 'keyword',
              ignore_above: 1024,
            },
            boot: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                postal_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                timezone: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            hostname: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            ip: {
              type: 'ip',
            },
            mac: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            os: {
              properties: {
                Ext: {
                  properties: {
                    variant: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                family: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                full: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                kernel: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                platform: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            pid_ns_ino: {
              type: 'keyword',
              ignore_above: 1024,
            },
            type: {
              type: 'keyword',
              ignore_above: 1024,
            },
            uptime: {
              type: 'long',
            },
            user: {
              properties: {
                Ext: {
                  properties: {
                    real: {
                      properties: {
                        id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                  },
                },
                domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                email: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                full_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
                group: {
                  properties: {
                    Ext: {
                      properties: {
                        real: {
                          properties: {
                            id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    domain: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                hash: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
              },
            },
          },
        },
        message: {
          type: 'match_only_text',
        },
        orchestrator: {
          properties: {
            cluster: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            namespace: {
              type: 'keyword',
              ignore_above: 1024,
            },
            resource: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        process: {
          properties: {
            Ext: {
              properties: {
                ancestry: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                architecture: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                authentication_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                code_signature: {
                  type: 'nested',
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                dll: {
                  properties: {
                    Ext: {
                      properties: {
                        code_signature: {
                          type: 'nested',
                          properties: {
                            exists: {
                              type: 'boolean',
                            },
                            status: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            subject_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            trusted: {
                              type: 'boolean',
                            },
                            valid: {
                              type: 'boolean',
                            },
                          },
                        },
                        compile_time: {
                          type: 'date',
                        },
                        mapped_address: {
                          type: 'unsigned_long',
                        },
                        mapped_size: {
                          type: 'unsigned_long',
                        },
                      },
                    },
                    code_signature: {
                      properties: {
                        exists: {
                          type: 'boolean',
                        },
                        signing_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        status: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        team_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        trusted: {
                          type: 'boolean',
                        },
                        valid: {
                          type: 'boolean',
                        },
                      },
                    },
                    hash: {
                      properties: {
                        md5: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha1: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha256: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha512: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pe: {
                      properties: {
                        company: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        description: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        file_version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        imphash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        original_file_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        product: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                  },
                },
                malware_classification: {
                  properties: {
                    features: {
                      enabled: false,
                      properties: {
                        data: {
                          properties: {
                            buffer: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            decompressed_size: {
                              type: 'long',
                            },
                            encoding: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    identifier: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    score: {
                      type: 'double',
                    },
                    threshold: {
                      type: 'double',
                    },
                    upx_packed: {
                      type: 'boolean',
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                memory_region: {
                  properties: {
                    allocation_base: {
                      type: 'unsigned_long',
                    },
                    allocation_protection: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    allocation_size: {
                      type: 'unsigned_long',
                    },
                    allocation_type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    bytes_address: {
                      type: 'unsigned_long',
                    },
                    bytes_allocation_offset: {
                      type: 'unsigned_long',
                    },
                    bytes_compressed: {
                      type: 'keyword',
                      index: false,
                      doc_values: false,
                    },
                    bytes_compressed_present: {
                      type: 'boolean',
                    },
                    malware_signature: {
                      properties: {
                        all_names: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        identifier: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        primary: {
                          properties: {
                            matches: {
                              type: 'keyword',
                              index: false,
                              doc_values: false,
                            },
                            signature: {
                              properties: {
                                hash: {
                                  type: 'nested',
                                  properties: {
                                    sha256: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                  },
                                },
                                id: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                          },
                        },
                        version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    mapped_path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    mapped_pe: {
                      properties: {
                        company: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        description: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        file_version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        imphash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        original_file_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        product: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    mapped_pe_detected: {
                      type: 'boolean',
                    },
                    memory_pe: {
                      properties: {
                        company: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        description: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        file_version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        imphash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        original_file_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        product: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    memory_pe_detected: {
                      type: 'boolean',
                    },
                    region_base: {
                      type: 'unsigned_long',
                    },
                    region_protection: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_size: {
                      type: 'unsigned_long',
                    },
                    region_state: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    strings: {
                      type: 'keyword',
                      index: false,
                      doc_values: false,
                    },
                  },
                },
                protection: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                services: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                session: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                token: {
                  properties: {
                    domain: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    elevation: {
                      type: 'boolean',
                    },
                    elevation_type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    impersonation_level: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    integrity_level: {
                      type: 'long',
                    },
                    integrity_level_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    is_appcontainer: {
                      type: 'boolean',
                    },
                    privileges: {
                      type: 'nested',
                      properties: {
                        description: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        enabled: {
                          type: 'boolean',
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    sid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    user: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                user: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            args: {
              type: 'keyword',
              ignore_above: 1024,
            },
            args_count: {
              type: 'long',
            },
            code_signature: {
              properties: {
                exists: {
                  type: 'boolean',
                },
                signing_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                status: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                subject_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                team_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                trusted: {
                  type: 'boolean',
                },
                valid: {
                  type: 'boolean',
                },
              },
            },
            command_line: {
              type: 'wildcard',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            entity_id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            entry_leader: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                entry_meta: {
                  properties: {
                    source: {
                      properties: {
                        ip: {
                          type: 'ip',
                        },
                      },
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                parent: {
                  properties: {
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pid: {
                      type: 'long',
                    },
                    session_leader: {
                      properties: {
                        entity_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        pid: {
                          type: 'long',
                        },
                        start: {
                          type: 'date',
                        },
                      },
                    },
                    start: {
                      type: 'date',
                    },
                  },
                },
                pid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                same_as_process: {
                  type: 'boolean',
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            env_vars: {
              type: 'object',
            },
            executable: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            exit_code: {
              type: 'long',
            },
            group_leader: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                pid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                same_as_process: {
                  type: 'boolean',
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            hash: {
              properties: {
                md5: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha1: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha256: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                sha512: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            interactive: {
              type: 'boolean',
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
            parent: {
              properties: {
                Ext: {
                  properties: {
                    architecture: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    code_signature: {
                      type: 'nested',
                      properties: {
                        exists: {
                          type: 'boolean',
                        },
                        status: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        trusted: {
                          type: 'boolean',
                        },
                        valid: {
                          type: 'boolean',
                        },
                      },
                    },
                    dll: {
                      properties: {
                        Ext: {
                          properties: {
                            code_signature: {
                              type: 'nested',
                              properties: {
                                exists: {
                                  type: 'boolean',
                                },
                                status: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                subject_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                trusted: {
                                  type: 'boolean',
                                },
                                valid: {
                                  type: 'boolean',
                                },
                              },
                            },
                            compile_time: {
                              type: 'date',
                            },
                            mapped_address: {
                              type: 'unsigned_long',
                            },
                            mapped_size: {
                              type: 'unsigned_long',
                            },
                          },
                        },
                        code_signature: {
                          properties: {
                            exists: {
                              type: 'boolean',
                            },
                            signing_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            status: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            subject_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            team_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            trusted: {
                              type: 'boolean',
                            },
                            valid: {
                              type: 'boolean',
                            },
                          },
                        },
                        hash: {
                          properties: {
                            md5: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha1: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha256: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha512: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        pe: {
                          properties: {
                            company: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            file_version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            imphash: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            original_file_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            product: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    protection: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    real: {
                      properties: {
                        pid: {
                          type: 'long',
                        },
                      },
                    },
                    token: {
                      properties: {
                        domain: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        elevation: {
                          type: 'boolean',
                        },
                        elevation_type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        impersonation_level: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        integrity_level: {
                          type: 'long',
                        },
                        integrity_level_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        is_appcontainer: {
                          type: 'boolean',
                        },
                        privileges: {
                          type: 'nested',
                          properties: {
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            enabled: {
                              type: 'boolean',
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        sid: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        user: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    user: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                code_signature: {
                  properties: {
                    exists: {
                      type: 'boolean',
                    },
                    signing_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    status: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    team_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    trusted: {
                      type: 'boolean',
                    },
                    valid: {
                      type: 'boolean',
                    },
                  },
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                exit_code: {
                  type: 'long',
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                group_leader: {
                  properties: {
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pid: {
                      type: 'long',
                    },
                    start: {
                      type: 'date',
                    },
                  },
                },
                hash: {
                  properties: {
                    md5: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha1: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha256: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    sha512: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                pe: {
                  properties: {
                    company: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    description: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    file_version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    imphash: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    original_file_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    product: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                pgid: {
                  type: 'long',
                },
                pid: {
                  type: 'long',
                },
                ppid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                thread: {
                  properties: {
                    id: {
                      type: 'long',
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                title: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                uptime: {
                  type: 'long',
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            pe: {
              properties: {
                company: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                description: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                file_version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                imphash: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                original_file_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                product: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            pgid: {
              type: 'long',
            },
            pid: {
              type: 'long',
            },
            ppid: {
              type: 'long',
            },
            previous: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            real_group: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            real_user: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
              },
            },
            saved_group: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            saved_user: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
              },
            },
            session_leader: {
              properties: {
                args: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                args_count: {
                  type: 'long',
                },
                command_line: {
                  type: 'wildcard',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                entity_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                executable: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                interactive: {
                  type: 'boolean',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
                parent: {
                  properties: {
                    entity_id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    pid: {
                      type: 'long',
                    },
                    session_leader: {
                      properties: {
                        entity_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        pid: {
                          type: 'long',
                        },
                        start: {
                          type: 'date',
                        },
                      },
                    },
                    start: {
                      type: 'date',
                    },
                  },
                },
                pid: {
                  type: 'long',
                },
                real_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                real_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                same_as_process: {
                  type: 'boolean',
                },
                saved_group: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                saved_user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                start: {
                  type: 'date',
                },
                supplemental_groups: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                tty: {
                  properties: {
                    char_device: {
                      properties: {
                        major: {
                          type: 'long',
                        },
                        minor: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                user: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                  },
                },
                working_directory: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    caseless: {
                      type: 'keyword',
                      ignore_above: 1024,
                      normalizer: 'lowercase',
                    },
                    text: {
                      type: 'text',
                    },
                  },
                },
              },
            },
            start: {
              type: 'date',
            },
            supplemental_groups: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            thread: {
              properties: {
                Ext: {
                  properties: {
                    call_stack: {
                      enabled: false,
                      properties: {
                        instruction_pointer: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        memory_section: {
                          properties: {
                            memory_address: {
                              type: 'keyword',
                              index: false,
                              doc_values: false,
                            },
                            memory_size: {
                              type: 'keyword',
                              index: false,
                              doc_values: false,
                            },
                            protection: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        module_name: {
                          type: 'keyword',
                          index: false,
                          doc_values: false,
                        },
                        module_path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        rva: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        symbol_info: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    call_stack_final_user_module: {
                      type: 'nested',
                      properties: {
                        code_signature: {
                          type: 'nested',
                          properties: {
                            exists: {
                              type: 'boolean',
                            },
                            status: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            subject_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            trusted: {
                              type: 'boolean',
                            },
                            valid: {
                              type: 'boolean',
                            },
                          },
                        },
                        hash: {
                          properties: {
                            sha256: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    call_stack_summary: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    parameter: {
                      type: 'unsigned_long',
                    },
                    parameter_bytes_compressed: {
                      type: 'keyword',
                      index: false,
                      doc_values: false,
                    },
                    parameter_bytes_compressed_present: {
                      type: 'boolean',
                    },
                    service: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    start: {
                      type: 'date',
                    },
                    start_address: {
                      type: 'unsigned_long',
                    },
                    start_address_allocation_offset: {
                      type: 'unsigned_long',
                    },
                    start_address_bytes: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    start_address_bytes_disasm: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    start_address_bytes_disasm_hash: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    start_address_module: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    token: {
                      properties: {
                        domain: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        elevation: {
                          type: 'boolean',
                        },
                        elevation_type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        impersonation_level: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        integrity_level: {
                          type: 'long',
                        },
                        integrity_level_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        is_appcontainer: {
                          type: 'boolean',
                        },
                        privileges: {
                          type: 'nested',
                          properties: {
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            enabled: {
                              type: 'boolean',
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        sid: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        user: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    uptime: {
                      type: 'long',
                    },
                  },
                },
                id: {
                  type: 'long',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            title: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
            },
            tty: {
              properties: {
                char_device: {
                  properties: {
                    major: {
                      type: 'long',
                    },
                    minor: {
                      type: 'long',
                    },
                  },
                },
              },
            },
            uptime: {
              type: 'long',
            },
            user: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
              },
            },
            working_directory: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                caseless: {
                  type: 'keyword',
                  ignore_above: 1024,
                  normalizer: 'lowercase',
                },
                text: {
                  type: 'text',
                },
              },
            },
          },
        },
        registry: {
          properties: {
            data: {
              properties: {
                strings: {
                  type: 'wildcard',
                  ignore_above: 1024,
                },
              },
            },
            path: {
              type: 'keyword',
              ignore_above: 1024,
            },
            value: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        rule: {
          properties: {
            author: {
              type: 'keyword',
              ignore_above: 1024,
            },
            category: {
              type: 'keyword',
              ignore_above: 1024,
            },
            description: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            license: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
            },
            reference: {
              type: 'keyword',
              ignore_above: 1024,
            },
            ruleset: {
              type: 'keyword',
              ignore_above: 1024,
            },
            uuid: {
              type: 'keyword',
              ignore_above: 1024,
            },
            version: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        source: {
          properties: {
            geo: {
              properties: {
                city_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                continent_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                country_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                postal_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                timezone: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            ip: {
              type: 'ip',
            },
          },
        },
        threat: {
          properties: {
            enrichments: {
              type: 'nested',
              properties: {
                indicator: {
                  properties: {
                    file: {
                      properties: {
                        Ext: {
                          properties: {
                            code_signature: {
                              type: 'nested',
                              properties: {
                                exists: {
                                  type: 'boolean',
                                },
                                status: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                subject_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                trusted: {
                                  type: 'boolean',
                                },
                                valid: {
                                  type: 'boolean',
                                },
                              },
                            },
                            device: {
                              properties: {
                                bus_type: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                dos_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                nt_name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                product_id: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                serial_number: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                vendor_id: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            entropy: {
                              type: 'double',
                            },
                            entry_modified: {
                              type: 'double',
                            },
                            header_bytes: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            header_data: {
                              type: 'text',
                            },
                            malware_classification: {
                              properties: {
                                features: {
                                  properties: {
                                    data: {
                                      properties: {
                                        buffer: {
                                          type: 'keyword',
                                          ignore_above: 1024,
                                        },
                                        decompressed_size: {
                                          type: 'long',
                                        },
                                        encoding: {
                                          type: 'keyword',
                                          ignore_above: 1024,
                                        },
                                      },
                                    },
                                  },
                                },
                                identifier: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                score: {
                                  type: 'double',
                                },
                                threshold: {
                                  type: 'double',
                                },
                                upx_packed: {
                                  type: 'boolean',
                                },
                                version: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            malware_signature: {
                              type: 'nested',
                              properties: {
                                all_names: {
                                  type: 'text',
                                },
                                identifier: {
                                  type: 'text',
                                },
                                primary: {
                                  type: 'nested',
                                  properties: {
                                    matches: {
                                      type: 'nested',
                                    },
                                    signature: {
                                      type: 'nested',
                                      properties: {
                                        hash: {
                                          type: 'nested',
                                          properties: {
                                            sha256: {
                                              type: 'keyword',
                                              ignore_above: 1024,
                                            },
                                          },
                                        },
                                        id: {
                                          type: 'keyword',
                                          ignore_above: 1024,
                                        },
                                        name: {
                                          type: 'keyword',
                                          ignore_above: 1024,
                                        },
                                      },
                                    },
                                  },
                                },
                                secondary: {
                                  type: 'nested',
                                },
                                version: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            monotonic_id: {
                              type: 'unsigned_long',
                            },
                            original: {
                              properties: {
                                gid: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                group: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                mode: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                owner: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                path: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                uid: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            quarantine_message: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            quarantine_path: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            quarantine_result: {
                              type: 'boolean',
                            },
                            temp_file_path: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            windows: {
                              properties: {
                                zone_identifier: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                          },
                        },
                        accessed: {
                          type: 'date',
                        },
                        attributes: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        code_signature: {
                          properties: {
                            exists: {
                              type: 'boolean',
                            },
                            signing_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            status: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            subject_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            team_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            trusted: {
                              type: 'boolean',
                            },
                            valid: {
                              type: 'boolean',
                            },
                          },
                        },
                        created: {
                          type: 'date',
                        },
                        ctime: {
                          type: 'date',
                        },
                        device: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        directory: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        drive_letter: {
                          type: 'keyword',
                          ignore_above: 1,
                        },
                        elf: {
                          properties: {
                            architecture: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            byte_order: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            cpu_type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            creation_date: {
                              type: 'date',
                            },
                            exports: {
                              type: 'flattened',
                            },
                            header: {
                              properties: {
                                abi_version: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                class: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                data: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                entrypoint: {
                                  type: 'long',
                                },
                                object_version: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                os_abi: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                type: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                version: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            imports: {
                              type: 'flattened',
                            },
                            sections: {
                              type: 'nested',
                              properties: {
                                chi2: {
                                  type: 'long',
                                },
                                entropy: {
                                  type: 'long',
                                },
                                flags: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                name: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                physical_offset: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                physical_size: {
                                  type: 'long',
                                },
                                type: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                virtual_address: {
                                  type: 'long',
                                },
                                virtual_size: {
                                  type: 'long',
                                },
                              },
                            },
                            segments: {
                              type: 'nested',
                              properties: {
                                sections: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                                type: {
                                  type: 'keyword',
                                  ignore_above: 1024,
                                },
                              },
                            },
                            shared_libraries: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            telfhash: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        extension: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        gid: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        group: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        hash: {
                          properties: {
                            md5: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha1: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha256: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            sha512: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            ssdeep: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        inode: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        mime_type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        mode: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        mtime: {
                          type: 'date',
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        owner: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        path: {
                          type: 'keyword',
                          ignore_above: 1024,
                          fields: {
                            caseless: {
                              type: 'keyword',
                              ignore_above: 1024,
                              normalizer: 'lowercase',
                            },
                            text: {
                              type: 'text',
                            },
                          },
                        },
                        pe: {
                          properties: {
                            architecture: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            company: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            description: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            file_version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            imphash: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            original_file_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            product: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        size: {
                          type: 'long',
                        },
                        target_path: {
                          type: 'keyword',
                          ignore_above: 1024,
                          fields: {
                            caseless: {
                              type: 'keyword',
                              ignore_above: 1024,
                              normalizer: 'lowercase',
                            },
                            text: {
                              type: 'text',
                            },
                          },
                        },
                        type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        uid: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    first_seen: {
                      type: 'date',
                    },
                    geo: {
                      properties: {
                        city_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        continent_code: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        continent_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        country_iso_code: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        country_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        location: {
                          type: 'geo_point',
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        postal_code: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        region_iso_code: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        region_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        timezone: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    ip: {
                      type: 'ip',
                    },
                    last_seen: {
                      type: 'date',
                    },
                    marking: {
                      properties: {
                        tlp: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    modified_at: {
                      type: 'date',
                    },
                    port: {
                      type: 'long',
                    },
                    provider: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    reference: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    registry: {
                      properties: {
                        data: {
                          properties: {
                            bytes: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            strings: {
                              type: 'wildcard',
                              ignore_above: 1024,
                            },
                            type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        hive: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        key: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        value: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    scanner_stats: {
                      type: 'long',
                    },
                    sightings: {
                      type: 'long',
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    url: {
                      properties: {
                        domain: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        extension: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        fragment: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        full: {
                          type: 'wildcard',
                          ignore_above: 1024,
                          fields: {
                            text: {
                              type: 'match_only_text',
                            },
                          },
                        },
                        original: {
                          type: 'wildcard',
                          ignore_above: 1024,
                          fields: {
                            text: {
                              type: 'match_only_text',
                            },
                          },
                        },
                        password: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        path: {
                          type: 'wildcard',
                          ignore_above: 1024,
                        },
                        port: {
                          type: 'long',
                        },
                        query: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        registered_domain: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        scheme: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subdomain: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        top_level_domain: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        username: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    x509: {
                      properties: {
                        alternative_names: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        issuer: {
                          properties: {
                            common_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            country: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            distinguished_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            locality: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            organization: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            organizational_unit: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            state_or_province: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        not_after: {
                          type: 'date',
                        },
                        not_before: {
                          type: 'date',
                        },
                        public_key_algorithm: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        public_key_curve: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        public_key_exponent: {
                          type: 'long',
                          index: false,
                          doc_values: false,
                        },
                        public_key_size: {
                          type: 'long',
                        },
                        serial_number: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        signature_algorithm: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject: {
                          properties: {
                            common_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            country: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            distinguished_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            locality: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            organization: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            organizational_unit: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            state_or_province: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        version_number: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                  },
                },
                matched: {
                  properties: {
                    atomic: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    field: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    index: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            framework: {
              type: 'keyword',
              ignore_above: 1024,
            },
            group: {
              properties: {
                alias: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            indicator: {
              properties: {
                as: {
                  properties: {
                    number: {
                      type: 'long',
                    },
                    organization: {
                      properties: {
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                          fields: {
                            text: {
                              type: 'match_only_text',
                            },
                          },
                        },
                      },
                    },
                  },
                },
                confidence: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                description: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                email: {
                  properties: {
                    address: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                file: {
                  properties: {
                    Ext: {
                      properties: {
                        code_signature: {
                          type: 'nested',
                          properties: {
                            exists: {
                              type: 'boolean',
                            },
                            status: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            subject_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            trusted: {
                              type: 'boolean',
                            },
                            valid: {
                              type: 'boolean',
                            },
                          },
                        },
                        device: {
                          properties: {
                            bus_type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            dos_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            nt_name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            product_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            serial_number: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            vendor_id: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        entropy: {
                          type: 'double',
                        },
                        entry_modified: {
                          type: 'double',
                        },
                        header_bytes: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        header_data: {
                          type: 'text',
                        },
                        malware_classification: {
                          properties: {
                            features: {
                              properties: {
                                data: {
                                  properties: {
                                    buffer: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                    decompressed_size: {
                                      type: 'long',
                                    },
                                    encoding: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                  },
                                },
                              },
                            },
                            identifier: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            score: {
                              type: 'double',
                            },
                            threshold: {
                              type: 'double',
                            },
                            upx_packed: {
                              type: 'boolean',
                            },
                            version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        malware_signature: {
                          type: 'nested',
                          properties: {
                            all_names: {
                              type: 'text',
                            },
                            identifier: {
                              type: 'text',
                            },
                            primary: {
                              type: 'nested',
                              properties: {
                                matches: {
                                  type: 'nested',
                                },
                                signature: {
                                  type: 'nested',
                                  properties: {
                                    hash: {
                                      type: 'nested',
                                      properties: {
                                        sha256: {
                                          type: 'keyword',
                                          ignore_above: 1024,
                                        },
                                      },
                                    },
                                    id: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                    name: {
                                      type: 'keyword',
                                      ignore_above: 1024,
                                    },
                                  },
                                },
                              },
                            },
                            secondary: {
                              type: 'nested',
                            },
                            version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        monotonic_id: {
                          type: 'unsigned_long',
                        },
                        original: {
                          properties: {
                            gid: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            group: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            mode: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            owner: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            path: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            uid: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        quarantine_message: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        quarantine_path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        quarantine_result: {
                          type: 'boolean',
                        },
                        temp_file_path: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        windows: {
                          properties: {
                            zone_identifier: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                      },
                    },
                    accessed: {
                      type: 'date',
                    },
                    attributes: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    code_signature: {
                      properties: {
                        exists: {
                          type: 'boolean',
                        },
                        signing_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        status: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        subject_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        team_id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        trusted: {
                          type: 'boolean',
                        },
                        valid: {
                          type: 'boolean',
                        },
                      },
                    },
                    created: {
                      type: 'date',
                    },
                    ctime: {
                      type: 'date',
                    },
                    device: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    directory: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    drive_letter: {
                      type: 'keyword',
                      ignore_above: 1,
                    },
                    elf: {
                      properties: {
                        architecture: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        byte_order: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        cpu_type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        creation_date: {
                          type: 'date',
                        },
                        exports: {
                          type: 'flattened',
                        },
                        header: {
                          properties: {
                            abi_version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            class: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            data: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            entrypoint: {
                              type: 'long',
                            },
                            object_version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            os_abi: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            version: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        imports: {
                          type: 'flattened',
                        },
                        sections: {
                          type: 'nested',
                          properties: {
                            chi2: {
                              type: 'long',
                            },
                            entropy: {
                              type: 'long',
                            },
                            flags: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            name: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            physical_offset: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            physical_size: {
                              type: 'long',
                            },
                            type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            virtual_address: {
                              type: 'long',
                            },
                            virtual_size: {
                              type: 'long',
                            },
                          },
                        },
                        segments: {
                          type: 'nested',
                          properties: {
                            sections: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                            type: {
                              type: 'keyword',
                              ignore_above: 1024,
                            },
                          },
                        },
                        shared_libraries: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        telfhash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    extension: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    gid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    group: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    hash: {
                      properties: {
                        md5: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha1: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha256: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        sha512: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        ssdeep: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    inode: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    mime_type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    mode: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    mtime: {
                      type: 'date',
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    owner: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        caseless: {
                          type: 'keyword',
                          ignore_above: 1024,
                          normalizer: 'lowercase',
                        },
                        text: {
                          type: 'text',
                        },
                      },
                    },
                    pe: {
                      properties: {
                        architecture: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        company: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        description: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        file_version: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        imphash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        original_file_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        product: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    size: {
                      type: 'long',
                    },
                    target_path: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        caseless: {
                          type: 'keyword',
                          ignore_above: 1024,
                          normalizer: 'lowercase',
                        },
                        text: {
                          type: 'text',
                        },
                      },
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    uid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                first_seen: {
                  type: 'date',
                },
                geo: {
                  properties: {
                    city_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    continent_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    continent_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    country_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    country_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    location: {
                      type: 'geo_point',
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    postal_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    timezone: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                ip: {
                  type: 'ip',
                },
                last_seen: {
                  type: 'date',
                },
                marking: {
                  properties: {
                    tlp: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                modified_at: {
                  type: 'date',
                },
                port: {
                  type: 'long',
                },
                provider: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                registry: {
                  properties: {
                    data: {
                      properties: {
                        bytes: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        strings: {
                          type: 'wildcard',
                          ignore_above: 1024,
                        },
                        type: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    hive: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    key: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    value: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                scanner_stats: {
                  type: 'long',
                },
                sightings: {
                  type: 'long',
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                url: {
                  properties: {
                    domain: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    extension: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    fragment: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    full: {
                      type: 'wildcard',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                    original: {
                      type: 'wildcard',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                    password: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    path: {
                      type: 'wildcard',
                      ignore_above: 1024,
                    },
                    port: {
                      type: 'long',
                    },
                    query: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    registered_domain: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    scheme: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subdomain: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    top_level_domain: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    username: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                x509: {
                  properties: {
                    alternative_names: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    issuer: {
                      properties: {
                        common_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        country: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        distinguished_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        locality: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        organization: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        organizational_unit: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        state_or_province: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    not_after: {
                      type: 'date',
                    },
                    not_before: {
                      type: 'date',
                    },
                    public_key_algorithm: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    public_key_curve: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    public_key_exponent: {
                      type: 'long',
                      index: false,
                      doc_values: false,
                    },
                    public_key_size: {
                      type: 'long',
                    },
                    serial_number: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    signature_algorithm: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject: {
                      properties: {
                        common_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        country: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        distinguished_name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        locality: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        organization: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        organizational_unit: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        state_or_province: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    version_number: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            software: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                platforms: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            tactic: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            technique: {
              properties: {
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                },
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                subtechnique: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'match_only_text',
                        },
                      },
                    },
                    reference: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
          },
        },
        user: {
          properties: {
            Ext: {
              properties: {
                real: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            domain: {
              type: 'keyword',
              ignore_above: 1024,
            },
            email: {
              type: 'keyword',
              ignore_above: 1024,
            },
            full_name: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
            },
            group: {
              properties: {
                Ext: {
                  properties: {
                    real: {
                      properties: {
                        id: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                  },
                },
                domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            hash: {
              type: 'keyword',
              ignore_above: 1024,
            },
            id: {
              type: 'keyword',
              ignore_above: 1024,
            },
            name: {
              type: 'keyword',
              ignore_above: 1024,
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
            },
          },
        },
      },
    },
  },
};
