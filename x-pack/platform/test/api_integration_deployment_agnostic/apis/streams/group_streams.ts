/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS } from '@kbn/management-settings-ids';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';
import { createStreams } from './helpers/create_streams';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Group streams', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
      await esClient.indices.deleteDataStream({
        name: 'logs-existing-datastream',
      });
    });

    describe('before enabling', () => {
      it('does not allow creation of Group streams', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  description: 'A Group stream',
                  group: {
                    tags: [],
                    members: ['logs'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(422);
      });

      it('does not allow updating using the _group endpoint', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}/_group 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                group: {
                  tags: [],
                  members: ['logs'],
                },
              },
            },
          })
          .expect(422);
      });
    });

    describe('after enabling', () => {
      before(async () => {
        await createStreams(apiClient);
        await kibanaServer.uiSettings.update({
          [OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS]: true,
        });
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          [OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS]: false,
        });
      });

      describe('CRUD', () => {
        it('successfully creates a Group stream', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['logs'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(200);
        });

        it('successfully reads a Group stream', async () => {
          const response = await apiClient
            .fetch('GET /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
              },
            })
            .expect(200);

          expect(response.body).to.eql({
            stream: {
              name: 'test-group',
              description: 'A Group stream',
              group: {
                tags: [],
                members: ['logs'],
              },
            },
            dashboards: [],
            queries: [],
          });
        });

        it('successfully updates a Group stream', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['logs.test'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(200);

          const response = await apiClient
            .fetch('GET /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
              },
            })
            .expect(200);

          expect(response.body).to.eql({
            stream: {
              name: 'test-group',
              description: 'A Group stream',
              group: {
                tags: [],
                members: ['logs.test'],
              },
            },
            dashboards: [],
            queries: [],
          });
        });

        it('successfully deletes a Group stream', async () => {
          await apiClient
            .fetch('DELETE /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
              },
            })
            .expect(200);
        });
      });

      describe('validations', () => {
        it('allows Group streams to reference Group streams', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['logs', 'logs.test'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(200);

          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'dependent-group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['test-group'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(200);
        });

        it('cannot be deleted if another Group stream depends on it', async () => {
          await apiClient
            .fetch('DELETE /api/streams/{name} 2023-10-31', {
              params: {
                path: {
                  name: 'test-group',
                },
              },
            })
            .expect(400);
        });

        it('stops related streams from being deleted', async () => {
          await apiClient
            .fetch('DELETE /api/streams/{name} 2023-10-31', {
              params: {
                path: {
                  name: 'logs.test',
                },
              },
            })
            .expect(400);
        });

        it('cannot create a Group stream with itself as a member', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['test-group'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(400);
        });

        it('cannot create a Group stream with an unknown member', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['non-existent-stream'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(400);
        });

        it('cannot create a Group stream with duplicated relationships', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'test-group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['logs', 'logs'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(400);
        });

        it('cannot overwrite an existing data stream', async () => {
          await esClient.indices.createDataStream({
            name: 'logs-existing-datastream',
          });

          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'logs-existing-datastream' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['logs'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(400);
        });

        it('cannot create a Group stream prefixed with logs.', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: 'logs.group' },
                body: {
                  stream: {
                    description: 'A Group stream',
                    group: {
                      tags: [],
                      members: ['logs'],
                    },
                  },
                  dashboards: [],
                  queries: [],
                },
              },
            })
            .expect(400);
        });
      });

      describe('_group endpoint', () => {
        it('successfully upserts', async () => {
          await apiClient
            .fetch('PUT /api/streams/{name}/_group 2023-10-31', {
              params: {
                path: { name: 'test-group' },
                body: {
                  group: {
                    tags: [],
                    members: ['logs.test2'],
                  },
                },
              },
            })
            .expect(200);
        });

        it('successfully reads', async () => {
          const response = await apiClient
            .fetch('GET /api/streams/{name}/_group 2023-10-31', {
              params: {
                path: { name: 'test-group' },
              },
            })
            .expect(200);

          expect(response.body).to.eql({
            group: {
              tags: [],
              members: ['logs.test2'],
            },
          });
        });
      });

      describe('when listing streams', () => {
        it('should be included in the streams list', async () => {
          const response = await apiClient.fetch('GET /api/streams 2023-10-31').expect(200);
          expect(response.body.streams.some((stream) => stream.name === 'test-group')).to.eql(true);
        });
      });
    });
  });
}
