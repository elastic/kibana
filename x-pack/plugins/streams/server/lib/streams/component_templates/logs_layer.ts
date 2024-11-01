/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ASSET_VERSION } from '../../../../common/constants';

export const logsLayer: ClusterPutComponentTemplateRequest = {
  name: 'logs@stream.layer',
  template: {
    settings: {
      index: {
        lifecycle: {
          name: 'logs',
        },
        codec: 'best_compression',
        mapping: {
          total_fields: {
            ignore_dynamic_beyond_limit: true,
          },
          ignore_malformed: true,
        },
      },
    },
    mappings: {
      dynamic: false,
      date_detection: false,
      properties: {
        '@timestamp': {
          type: 'date',
        },

        // Base
        labels: {
          type: 'object',
        },
        message: {
          type: 'match_only_text',
        },
        tags: {
          ignore_above: 1024,
          type: 'keyword',
        },
        event: {
          properties: {
            ingested: {
              type: 'date',
            },
          },
        },

        // file
        file: {
          properties: {
            accessed: {
              type: 'date',
            },
            attributes: {
              ignore_above: 1024,
              type: 'keyword',
            },
            code_signature: {
              properties: {
                digest_algorithm: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                exists: {
                  type: 'boolean',
                },
                signing_id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                status: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                subject_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                team_id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                timestamp: {
                  type: 'date',
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
              ignore_above: 1024,
              type: 'keyword',
            },
            directory: {
              ignore_above: 1024,
              type: 'keyword',
            },
            drive_letter: {
              ignore_above: 1,
              type: 'keyword',
            },
            elf: {
              properties: {
                architecture: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                byte_order: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                cpu_type: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                creation_date: {
                  type: 'date',
                },
                exports: {
                  type: 'flattened',
                },
                go_import_hash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                go_imports: {
                  type: 'flattened',
                },
                go_imports_names_entropy: {
                  type: 'long',
                },
                go_imports_names_var_entropy: {
                  type: 'long',
                },
                go_stripped: {
                  type: 'boolean',
                },
                header: {
                  properties: {
                    abi_version: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    class: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    data: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    entrypoint: {
                      type: 'long',
                    },
                    object_version: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    os_abi: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    type: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    version: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                import_hash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                imports: {
                  type: 'flattened',
                },
                imports_names_entropy: {
                  type: 'long',
                },
                imports_names_var_entropy: {
                  type: 'long',
                },
                sections: {
                  properties: {
                    chi2: {
                      type: 'long',
                    },
                    entropy: {
                      type: 'long',
                    },
                    flags: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    physical_offset: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    physical_size: {
                      type: 'long',
                    },
                    type: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    var_entropy: {
                      type: 'long',
                    },
                    virtual_address: {
                      type: 'long',
                    },
                    virtual_size: {
                      type: 'long',
                    },
                  },
                  type: 'nested',
                },
                segments: {
                  properties: {
                    sections: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    type: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                  type: 'nested',
                },
                shared_libraries: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                telfhash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            extension: {
              ignore_above: 1024,
              type: 'keyword',
            },
            fork_name: {
              ignore_above: 1024,
              type: 'keyword',
            },
            gid: {
              ignore_above: 1024,
              type: 'keyword',
            },
            group: {
              ignore_above: 1024,
              type: 'keyword',
            },
            hash: {
              properties: {
                md5: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                sha1: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                sha256: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                sha384: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                sha512: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                ssdeep: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                tlsh: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            inode: {
              ignore_above: 1024,
              type: 'keyword',
            },
            macho: {
              properties: {
                go_import_hash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                go_imports: {
                  type: 'flattened',
                },
                go_imports_names_entropy: {
                  type: 'long',
                },
                go_imports_names_var_entropy: {
                  type: 'long',
                },
                go_stripped: {
                  type: 'boolean',
                },
                import_hash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                imports: {
                  type: 'flattened',
                },
                imports_names_entropy: {
                  type: 'long',
                },
                imports_names_var_entropy: {
                  type: 'long',
                },
                sections: {
                  properties: {
                    entropy: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    physical_size: {
                      type: 'long',
                    },
                    var_entropy: {
                      type: 'long',
                    },
                    virtual_size: {
                      type: 'long',
                    },
                  },
                  type: 'nested',
                },
                symhash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            mime_type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            mode: {
              ignore_above: 1024,
              type: 'keyword',
            },
            mtime: {
              type: 'date',
            },
            name: {
              ignore_above: 1024,
              type: 'keyword',
            },
            owner: {
              ignore_above: 1024,
              type: 'keyword',
            },
            path: {
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
              ignore_above: 1024,
              type: 'keyword',
            },
            pe: {
              properties: {
                architecture: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                company: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                description: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                file_version: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                go_import_hash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                go_imports: {
                  type: 'flattened',
                },
                go_imports_names_entropy: {
                  type: 'long',
                },
                go_imports_names_var_entropy: {
                  type: 'long',
                },
                go_stripped: {
                  type: 'boolean',
                },
                imphash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                import_hash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                imports: {
                  type: 'flattened',
                },
                imports_names_entropy: {
                  type: 'long',
                },
                imports_names_var_entropy: {
                  type: 'long',
                },
                original_file_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                pehash: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                product: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                sections: {
                  properties: {
                    entropy: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    physical_size: {
                      type: 'long',
                    },
                    var_entropy: {
                      type: 'long',
                    },
                    virtual_size: {
                      type: 'long',
                    },
                  },
                  type: 'nested',
                },
              },
            },
            size: {
              type: 'long',
            },
            target_path: {
              fields: {
                text: {
                  type: 'match_only_text',
                },
              },
              ignore_above: 1024,
              type: 'keyword',
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            uid: {
              ignore_above: 1024,
              type: 'keyword',
            },
            x509: {
              properties: {
                alternative_names: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                issuer: {
                  properties: {
                    common_name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    country: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    distinguished_name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    locality: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    organization: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    organizational_unit: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    state_or_province: {
                      ignore_above: 1024,
                      type: 'keyword',
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
                  ignore_above: 1024,
                  type: 'keyword',
                },
                public_key_curve: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                public_key_exponent: {
                  doc_values: false,
                  index: false,
                  type: 'long',
                },
                public_key_size: {
                  type: 'long',
                },
                serial_number: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                signature_algorithm: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                subject: {
                  properties: {
                    common_name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    country: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    distinguished_name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    locality: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    organization: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    organizational_unit: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    state_or_province: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                version_number: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
          },
        },

        // Host
        host: {
          properties: {
            architecture: {
              ignore_above: 1024,
              type: 'keyword',
            },
            cpu: {
              properties: {
                usage: {
                  scaling_factor: 1000,
                  type: 'scaled_float',
                },
              },
            },
            disk: {
              properties: {
                read: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                  },
                },
                write: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                  },
                },
              },
            },
            domain: {
              ignore_above: 1024,
              type: 'keyword',
            },
            geo: {
              properties: {
                city_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                continent_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                continent_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                country_iso_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                country_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                postal_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region_iso_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                timezone: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            hostname: {
              ignore_above: 1024,
              type: 'keyword',
            },
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            ip: {
              type: 'ip',
            },
            mac: {
              ignore_above: 1024,
              type: 'keyword',
            },
            name: {
              ignore_above: 1024,
              type: 'keyword',
            },
            network: {
              properties: {
                egress: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                    packets: {
                      type: 'long',
                    },
                  },
                },
                ingress: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                    packets: {
                      type: 'long',
                    },
                  },
                },
              },
            },
            os: {
              properties: {
                family: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                full: {
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                  ignore_above: 1024,
                  type: 'keyword',
                },
                kernel: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                  ignore_above: 1024,
                  type: 'keyword',
                },
                platform: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                type: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                version: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            uptime: {
              type: 'long',
            },
          },
        },

        // Orchestrator
        orchestrator: {
          properties: {
            api_version: {
              ignore_above: 1024,
              type: 'keyword',
            },
            cluster: {
              properties: {
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                url: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                version: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            namespace: {
              ignore_above: 1024,
              type: 'keyword',
            },
            organization: {
              ignore_above: 1024,
              type: 'keyword',
            },
            resource: {
              properties: {
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                type: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },

        log: {
          properties: {
            file: {
              properties: {
                path: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            level: {
              ignore_above: 1024,
              type: 'keyword',
            },
            logger: {
              ignore_above: 1024,
              type: 'keyword',
            },
            origin: {
              properties: {
                file: {
                  properties: {
                    line: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                function: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            syslog: {
              properties: {
                facility: {
                  properties: {
                    code: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                priority: {
                  type: 'long',
                },
                severity: {
                  properties: {
                    code: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
              },
              type: 'object',
            },
          },
        },

        // ECS
        ecs: {
          properties: {
            version: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },

        // Agent
        agent: {
          properties: {
            build: {
              properties: {
                original: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            ephemeral_id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            name: {
              ignore_above: 1024,
              type: 'keyword',
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            version: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },

        // Cloud
        cloud: {
          properties: {
            account: {
              properties: {
                id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            availability_zone: {
              ignore_above: 1024,
              type: 'keyword',
            },
            instance: {
              properties: {
                id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            machine: {
              properties: {
                type: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            origin: {
              properties: {
                account: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                availability_zone: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                instance: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                machine: {
                  properties: {
                    type: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                project: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                provider: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                service: {
                  properties: {
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
              },
            },
            project: {
              properties: {
                id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            provider: {
              ignore_above: 1024,
              type: 'keyword',
            },
            region: {
              ignore_above: 1024,
              type: 'keyword',
            },
            service: {
              properties: {
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            target: {
              properties: {
                account: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                availability_zone: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                instance: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                machine: {
                  properties: {
                    type: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                project: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                provider: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                service: {
                  properties: {
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  version: ASSET_VERSION,
  _meta: {
    managed: true,
    description: 'Default layer for logs stream',
  },
  deprecated: false,
};
