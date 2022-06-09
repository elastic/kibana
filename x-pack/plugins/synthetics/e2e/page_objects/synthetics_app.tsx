/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Page } from '@elastic/synthetics';
import { loginPageProvider } from './login';
import { utilsPageProvider } from './utils';

const SIXTY_SEC_TIMEOUT = {
  timeout: 60 * 1000,
};

export function syntheticsAppPageProvider({ page, kibanaUrl }: { page: Page; kibanaUrl: string }) {
  const remoteKibanaUrl = process.env.SYNTHETICS_REMOTE_KIBANA_URL;
  const remoteUsername = process.env.SYNTHETICS_REMOTE_KIBANA_USERNAME;
  const remotePassword = process.env.SYNTHETICS_REMOTE_KIBANA_PASSWORD;
  const isRemote = Boolean(process.env.SYNTHETICS_REMOTE_ENABLED);
  const basePath = isRemote ? remoteKibanaUrl : kibanaUrl;
  const monitorManagement = `${basePath}/app/synthetics/monitors`;
  const addMonitor = `${basePath}/app/uptime/add-monitor`;

  return {
    ...loginPageProvider({
      page,
      isRemote,
      username: isRemote ? remoteUsername : 'elastic',
      password: isRemote ? remotePassword : 'changeme',
    }),
    ...utilsPageProvider({ page }),

    async navigateToMonitorManagement() {
      await page.goto(monitorManagement, {
        waitUntil: 'networkidle',
      });
      await this.waitForMonitorManagementLoadingToFinish();
    },

    async waitForMonitorManagementLoadingToFinish() {
      while (true) {
        if ((await page.$(this.byTestId('uptimeLoader'))) === null) break;
        await page.waitForTimeout(5 * 1000);
      }
    },

    async getAddMonitorButton() {
      return await this.findByText('Create monitor');
    },

    async navigateToAddMonitor() {
      await page.goto(addMonitor, {
        waitUntil: 'networkidle',
      });
    },

    async ensureIsOnMonitorConfigPage() {
      await page.isVisible('[data-test-subj=monitorSettingsSection]');
    },

    async confirmAndSave(isEditPage?: boolean) {
      await this.ensureIsOnMonitorConfigPage();
      if (isEditPage) {
        await page.click('text=Update monitor');
      } else {
        await page.click('text=Create monitor');
      }
      return await this.findByText('Monitor added successfully.');
    },

    async selectLocations({ locations }: { locations: string[] }) {
      for (let i = 0; i < locations.length; i++) {
        await page.click(
          this.byTestId(`syntheticsServiceLocation--${locations[i]}`),
          SIXTY_SEC_TIMEOUT
        );
      }
    },

    async fillFirstMonitorDetails({ url, locations }: { url: string; locations: string[] }) {
      await this.fillByTestSubj('urls-input', url);
      await page.click(this.byTestId('comboBoxInput'));
      await this.selectLocations({ locations });
      await page.click(this.byTestId('urls-input'));
    },

    async enableMonitorManagement(shouldEnable: boolean = true) {
      const isEnabled = await this.checkIsEnabled();
      if (isEnabled === shouldEnable) {
        return;
      }
      const [toggle, button] = await Promise.all([
        page.$(this.byTestId('syntheticsEnableSwitch')),
        page.$(this.byTestId('syntheticsEnableButton')),
      ]);

      if (toggle === null && button === null) {
        return null;
      }
      if (toggle) {
        if (isEnabled !== shouldEnable) {
          await toggle.click();
        }
      } else {
        await button?.click();
      }
    },
    async checkIsEnabled() {
      await page.waitForTimeout(5 * 1000);
      const addMonitorBtn = await this.getAddMonitorButton();
      const isDisabled = await addMonitorBtn.isDisabled();
      return !isDisabled;
    },
  };
}

const data = {
  mappings: {
    _doc: {
      properties: {
        '@timestamp': {
          type: 'date',
        },
        '@version': {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        agent: {
          properties: {
            ephemeral_id: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
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
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            type: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            version: {
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
        awami: {
          properties: {
            key: {
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
        ecs: {
          properties: {
            version: {
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
        error: {
          properties: {
            message: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            type: {
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
        event: {
          properties: {
            dataset: {
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
        fields: {
          properties: {
            of: {
              properties: {
                ambiente: {
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
          },
        },
        http: {
          properties: {
            response: {
              properties: {
                body: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                    hash: {
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
                status_code: {
                  type: 'long',
                },
              },
            },
            rtt: {
              properties: {
                content: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
                response_header: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
                total: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
                validate: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
                write_request: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
              },
            },
          },
        },
        icmp: {
          properties: {
            requests: {
              type: 'long',
            },
            rtt: {
              properties: {
                us: {
                  type: 'long',
                },
              },
            },
          },
        },
        mappings: {
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
                hostname: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                  },
                },
              },
            },
            client: {
              properties: {
                address: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
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
                              type: 'text',
                              norms: false,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                bytes: {
                  type: 'long',
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
                    region_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                ip: {
                  type: 'ip',
                },
                mac: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                nat: {
                  properties: {
                    ip: {
                      type: 'ip',
                    },
                    port: {
                      type: 'long',
                    },
                  },
                },
                packets: {
                  type: 'long',
                },
                port: {
                  type: 'long',
                },
                registered_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                top_level_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                user: {
                  properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    group: {
                      properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                  },
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
                availability_zone: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                image: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                instance: {
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
                machine: {
                  properties: {
                    type: {
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
            code_signature: {
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
                labels: {
                  type: 'object',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                runtime: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            destination: {
              properties: {
                address: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
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
                              type: 'text',
                              norms: false,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                bytes: {
                  type: 'long',
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
                    region_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                ip: {
                  type: 'ip',
                },
                mac: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                nat: {
                  properties: {
                    ip: {
                      type: 'ip',
                    },
                    port: {
                      type: 'long',
                    },
                  },
                },
                packets: {
                  type: 'long',
                },
                port: {
                  type: 'long',
                },
                registered_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                top_level_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                user: {
                  properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    group: {
                      properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                  },
                },
              },
            },
            dll: {
              properties: {
                code_signature: {
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
                answers: {
                  properties: {
                    class: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    data: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    ttl: {
                      type: 'long',
                    },
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                header_flags: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                op_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                question: {
                  properties: {
                    class: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    registered_domain: {
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
                    type: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                resolved_ip: {
                  type: 'ip',
                },
                response_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            docker: {
              properties: {
                container: {
                  properties: {
                    labels: {
                      type: 'object',
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
            error: {
              properties: {
                code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                message: {
                  type: 'text',
                  norms: false,
                },
                stack_trace: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                type: {
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
                duration: {
                  type: 'long',
                },
                end: {
                  type: 'date',
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
                },
                kind: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                module: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                original: {
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
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                risk_score: {
                  type: 'float',
                },
                risk_score_norm: {
                  type: 'float',
                },
                sequence: {
                  type: 'long',
                },
                severity: {
                  type: 'long',
                },
                start: {
                  type: 'date',
                },
                timezone: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                url: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            fields: {
              type: 'object',
            },
            file: {
              properties: {
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
                    text: {
                      type: 'text',
                      norms: false,
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
                    text: {
                      type: 'text',
                      norms: false,
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
            geo: {
              properties: {
                city_name: {
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
                region_iso_code: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                region_name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            group: {
              properties: {
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
            host: {
              properties: {
                architecture: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                containerized: {
                  type: 'boolean',
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
                    region_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_name: {
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
                    build: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    codename: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    family: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    full: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'text',
                          norms: false,
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
                        text: {
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    platform: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    group: {
                      properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                  },
                },
              },
            },
            http: {
              properties: {
                request: {
                  properties: {
                    body: {
                      properties: {
                        bytes: {
                          type: 'long',
                        },
                        content: {
                          type: 'keyword',
                          ignore_above: 1024,
                          fields: {
                            text: {
                              type: 'text',
                              norms: false,
                            },
                          },
                        },
                      },
                    },
                    bytes: {
                      type: 'long',
                    },
                    method: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    referrer: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                response: {
                  properties: {
                    body: {
                      properties: {
                        bytes: {
                          type: 'long',
                        },
                        content: {
                          type: 'keyword',
                          ignore_above: 1024,
                          fields: {
                            text: {
                              type: 'text',
                              norms: false,
                            },
                          },
                        },
                        hash: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    bytes: {
                      type: 'long',
                    },
                    redirects: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    status_code: {
                      type: 'long',
                    },
                  },
                },
                rtt: {
                  properties: {
                    content: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                    response_header: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                    total: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                    validate: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                    validate_body: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                    write_request: {
                      properties: {
                        us: {
                          type: 'long',
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
            icmp: {
              properties: {
                requests: {
                  type: 'long',
                },
                rtt: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
              },
            },
            interface: {
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
              },
            },
            jolokia: {
              properties: {
                agent: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                secured: {
                  type: 'boolean',
                },
                server: {
                  properties: {
                    product: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    vendor: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                url: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            kubernetes: {
              properties: {
                annotations: {
                  properties: {
                    '*': {
                      type: 'object',
                    },
                  },
                },
                container: {
                  properties: {
                    image: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                deployment: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                labels: {
                  properties: {
                    '*': {
                      type: 'object',
                    },
                  },
                },
                namespace: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                node: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                pod: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    uid: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                replicaset: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                statefulset: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
            },
            labels: {
              type: 'object',
            },
            log: {
              properties: {
                level: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                logger: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                origin: {
                  properties: {
                    file: {
                      properties: {
                        line: {
                          type: 'long',
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                    function: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                original: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                syslog: {
                  properties: {
                    facility: {
                      properties: {
                        code: {
                          type: 'long',
                        },
                        name: {
                          type: 'keyword',
                          ignore_above: 1024,
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
                          type: 'keyword',
                          ignore_above: 1024,
                        },
                      },
                    },
                  },
                },
              },
            },
            message: {
              type: 'text',
              norms: false,
            },
            monitor: {
              properties: {
                check_group: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                duration: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ip: {
                  type: 'ip',
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                status: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                timespan: {
                  type: 'date_range',
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            network: {
              properties: {
                application: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                bytes: {
                  type: 'long',
                },
                community_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                direction: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                forwarded_ip: {
                  type: 'ip',
                },
                iana_number: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                inner: {
                  properties: {
                    vlan: {
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
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                packets: {
                  type: 'long',
                },
                protocol: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                transport: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                vlan: {
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
            observer: {
              properties: {
                egress: {
                  properties: {
                    interface: {
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
                      },
                    },
                    vlan: {
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
                    zone: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                geo: {
                  properties: {
                    city_name: {
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
                    region_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                hostname: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ingress: {
                  properties: {
                    interface: {
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
                      },
                    },
                    vlan: {
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
                    zone: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
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
                    family: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    full: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'text',
                          norms: false,
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
                        text: {
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    platform: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                product: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                serial_number: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                type: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                vendor: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            organization: {
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
                      type: 'text',
                      norms: false,
                    },
                  },
                },
              },
            },
            os: {
              properties: {
                family: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                full: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                      norms: false,
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
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                platform: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            package: {
              properties: {
                architecture: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                build_version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                checksum: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                description: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                install_scope: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                installed: {
                  type: 'date',
                },
                license: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                path: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                size: {
                  type: 'long',
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
            process: {
              properties: {
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
                command_line: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                      norms: false,
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
                    text: {
                      type: 'text',
                      norms: false,
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
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                parent: {
                  properties: {
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
                    command_line: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'text',
                          norms: false,
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
                        text: {
                          type: 'text',
                          norms: false,
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
                        text: {
                          type: 'text',
                          norms: false,
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
                          type: 'text',
                          norms: false,
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
                        text: {
                          type: 'text',
                          norms: false,
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
                      type: 'text',
                      norms: false,
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
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
              },
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
                      type: 'keyword',
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
            related: {
              properties: {
                hash: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                ip: {
                  type: 'ip',
                },
                user: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            resolve: {
              properties: {
                ip: {
                  type: 'ip',
                },
                rtt: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
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
            server: {
              properties: {
                address: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
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
                              type: 'text',
                              norms: false,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                bytes: {
                  type: 'long',
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
                    region_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                ip: {
                  type: 'ip',
                },
                mac: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                nat: {
                  properties: {
                    ip: {
                      type: 'ip',
                    },
                    port: {
                      type: 'long',
                    },
                  },
                },
                packets: {
                  type: 'long',
                },
                port: {
                  type: 'long',
                },
                registered_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                top_level_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                user: {
                  properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    group: {
                      properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                  },
                },
              },
            },
            service: {
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
                node: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                state: {
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
            socks5: {
              properties: {
                rtt: {
                  properties: {
                    connect: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
              },
            },
            source: {
              properties: {
                address: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
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
                              type: 'text',
                              norms: false,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                bytes: {
                  type: 'long',
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
                    region_iso_code: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    region_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                ip: {
                  type: 'ip',
                },
                mac: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                nat: {
                  properties: {
                    ip: {
                      type: 'ip',
                    },
                    port: {
                      type: 'long',
                    },
                  },
                },
                packets: {
                  type: 'long',
                },
                port: {
                  type: 'long',
                },
                registered_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                top_level_domain: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                user: {
                  properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    group: {
                      properties: {
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
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                  },
                },
              },
            },
            summary: {
              properties: {
                down: {
                  type: 'long',
                },
                up: {
                  type: 'long',
                },
              },
            },
            tags: {
              type: 'keyword',
              ignore_above: 1024,
            },
            tcp: {
              properties: {
                rtt: {
                  properties: {
                    connect: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                    validate: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
              },
            },
            threat: {
              properties: {
                framework: {
                  type: 'keyword',
                  ignore_above: 1024,
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
                          type: 'text',
                          norms: false,
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
            timeseries: {
              properties: {
                instance: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            tls: {
              properties: {
                certificate_not_valid_after: {
                  type: 'date',
                },
                certificate_not_valid_before: {
                  type: 'date',
                },
                cipher: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                client: {
                  properties: {
                    certificate: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    certificate_chain: {
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
                      },
                    },
                    issuer: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    ja3: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    not_after: {
                      type: 'date',
                    },
                    not_before: {
                      type: 'date',
                    },
                    server_name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    subject: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    supported_ciphers: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                curve: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                established: {
                  type: 'boolean',
                },
                next_protocol: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                resumed: {
                  type: 'boolean',
                },
                rtt: {
                  properties: {
                    handshake: {
                      properties: {
                        us: {
                          type: 'long',
                        },
                      },
                    },
                  },
                },
                server: {
                  properties: {
                    certificate: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    certificate_chain: {
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
                      },
                    },
                    issuer: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    ja3s: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    not_after: {
                      type: 'date',
                    },
                    not_before: {
                      type: 'date',
                    },
                    subject: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                version: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                version_protocol: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
            tracing: {
              properties: {
                trace: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                transaction: {
                  properties: {
                    id: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
              },
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
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                original: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                password: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                path: {
                  type: 'keyword',
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
            user: {
              properties: {
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
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                group: {
                  properties: {
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
                      type: 'text',
                      norms: false,
                    },
                  },
                },
              },
            },
            user_agent: {
              properties: {
                device: {
                  properties: {
                    name: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                name: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                original: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                os: {
                  properties: {
                    family: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    full: {
                      type: 'keyword',
                      ignore_above: 1024,
                      fields: {
                        text: {
                          type: 'text',
                          norms: false,
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
                        text: {
                          type: 'text',
                          norms: false,
                        },
                      },
                    },
                    platform: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                    version: {
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
            vlan: {
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
            vulnerability: {
              properties: {
                category: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                classification: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                description: {
                  type: 'keyword',
                  ignore_above: 1024,
                  fields: {
                    text: {
                      type: 'text',
                      norms: false,
                    },
                  },
                },
                enumeration: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                reference: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                report_id: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
                scanner: {
                  properties: {
                    vendor: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                score: {
                  properties: {
                    base: {
                      type: 'float',
                    },
                    environmental: {
                      type: 'float',
                    },
                    temporal: {
                      type: 'float',
                    },
                    version: {
                      type: 'keyword',
                      ignore_above: 1024,
                    },
                  },
                },
                severity: {
                  type: 'keyword',
                  ignore_above: 1024,
                },
              },
            },
          },
        },
        monitor: {
          properties: {
            check_group: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            duration: {
              properties: {
                us: {
                  type: 'long',
                },
              },
            },
            id: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            ip: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
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
            status: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            timespan: {
              properties: {
                gte: {
                  type: 'date',
                },
                lt: {
                  type: 'date',
                },
              },
            },
            type: {
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
        observer: {
          properties: {
            geo: {
              properties: {
                city_name: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                continent_name: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                country_iso_code: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                location: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
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
                region_iso_code: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                region_name: {
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
            hostname: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            ip: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            mac: {
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
        of: {
          properties: {
            ambiente: {
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
        resolve: {
          properties: {
            ip: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            rtt: {
              properties: {
                us: {
                  type: 'long',
                },
              },
            },
          },
        },
        summary: {
          properties: {
            down: {
              type: 'long',
            },
            up: {
              type: 'long',
            },
          },
        },
        tcp: {
          properties: {
            rtt: {
              properties: {
                connect: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
              },
            },
          },
        },
        tls: {
          properties: {
            certificate_not_valid_after: {
              type: 'date',
            },
            certificate_not_valid_before: {
              type: 'date',
            },
            rtt: {
              properties: {
                handshake: {
                  properties: {
                    us: {
                      type: 'long',
                    },
                  },
                },
              },
            },
          },
        },
        url: {
          properties: {
            domain: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            full: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            path: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            port: {
              type: 'long',
            },
            query: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            scheme: {
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
      },
    },
  },
};
