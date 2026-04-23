/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rawExpect from 'expect';
import expect from '@kbn/expect';
import type { Streams } from '@kbn/streams-schema';
import { emptyAssets } from '@kbn/streams-schema';
import { disableStreams, enableStreams, putStream, getIlmStats } from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { STREAMS_SNAPSHOT_REPO_PATH } from '../../default_configs/common_paths';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const config = getService('config');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const isServerless = !!config.get('serverless');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Lifecycle retention', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    const wiredPutBody: Streams.WiredStream.UpsertRequest = {
      stream: {
        type: 'wired',
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          settings: {},
          processing: { steps: [] },
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      },
      ...emptyAssets,
    };

    describe('ilm stats', () => {
      it('is not enabled for streams with dsl', async () => {
        const indexName = 'logs.otel.dslnostats';
        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [],
              },
              lifecycle: { dsl: { data_retention: '1d' } },
              failure_store: { inherit: {} },
            },
          },
        });
        await getIlmStats(apiClient, indexName, 400);
      });

      if (!isServerless) {
        it('returns not found when the policy does not exist', async () => {
          const indexName = 'logs.otel.ilmpolicydontexists';
          await putStream(apiClient, indexName, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [],
                },
                lifecycle: { ilm: { policy: 'this-stream-policy-does-not-exist' } },
                failure_store: { inherit: {} },
              },
            },
          });
          await getIlmStats(apiClient, indexName, 404);
        });

        it('returns the effective ilm phases', async () => {
          const indexName = 'logs.otel.ilmwithphases';
          const policyName = 'streams_ilm_hotwarmdelete';
          await esClient.ilm.putLifecycle({
            name: policyName,
            policy: {
              phases: {
                hot: { actions: { rollover: { max_age: '30m' } } },
                warm: { min_age: '5d', actions: {} },
                delete: { min_age: '10d', actions: {} },
              },
            },
          });

          await putStream(apiClient, indexName, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [],
                },
                lifecycle: { ilm: { policy: policyName } },
              },
            },
          });

          const stats = await getIlmStats(apiClient, indexName, 200);
          rawExpect(stats).toEqual({
            phases: {
              hot: {
                name: 'hot',
                size_in_bytes: rawExpect.any(Number),
                rollover: { max_age: '30m' },
                min_age: '0ms',
              },
              warm: {
                name: 'warm',
                min_age: '5d',
                size_in_bytes: rawExpect.any(Number),
              },
              delete: {
                name: 'delete',
                min_age: '10d',
              },
            },
          });
        });
      }
    });

    // These endpoints are only meaningful when ILM exists (non-serverless).
    // On serverless, the ES ILM APIs are not available and this route is expected to be unsupported.
    if (!isServerless) {
      describe('ilm policy upsert endpoint', () => {
        const policyName = `streams_ilm_policy_upsert_${Date.now()}`;

        after(async () => {
          try {
            await esClient.ilm.deleteLifecycle({ name: policyName });
          } catch (e) {
            // ignore cleanup errors
          }
        });

        it('POST /internal/streams/lifecycle/_policy creates a new policy', async () => {
          const response = await apiClient
            .fetch('POST /internal/streams/lifecycle/_policy', {
              params: {
                query: {},
                body: {
                  name: policyName,
                  phases: {
                    hot: { actions: { rollover: { max_age: '30m' } } },
                    warm: { min_age: '5d', actions: {} },
                  },
                  meta: { managed_by: 'streams' },
                  deprecated: false,
                },
              },
            })
            .expect(200);

          expect(response.body).to.eql({ acknowledged: true });

          const ilm = await esClient.ilm.getLifecycle({ name: policyName });
          expect(ilm).to.have.property(policyName);
        });

        it('POST /internal/streams/lifecycle/_policy returns 409 when policy exists and allow_overwrite is false', async () => {
          await apiClient
            .fetch('POST /internal/streams/lifecycle/_policy', {
              params: {
                query: {},
                body: {
                  name: policyName,
                  phases: {
                    hot: { actions: { rollover: { max_age: '30m' } } },
                  },
                },
              },
            })
            .expect(409);
        });

        it('POST /internal/streams/lifecycle/_policy overwrites when allow_overwrite=true', async () => {
          await apiClient
            .fetch('POST /internal/streams/lifecycle/_policy', {
              params: {
                query: {
                  allow_overwrite: 'true',
                },
                body: {
                  name: policyName,
                  phases: {
                    hot: { actions: { rollover: { max_age: '2h' } } },
                    delete: { min_age: '10d', actions: {} },
                  },
                  meta: { updated_by: 'streams' },
                },
              },
            })
            .expect(200);

          const ilm = await esClient.ilm.getLifecycle({ name: policyName });
          const phases = ilm[policyName]?.policy?.phases;
          expect(phases?.hot).to.not.be(undefined);
          expect(phases?.delete).to.not.be(undefined);
        });

        it('POST /internal/streams/lifecycle/_policy rejects policies without phases', async () => {
          await apiClient
            .fetch('POST /internal/streams/lifecycle/_policy', {
              params: {
                query: {},
                body: {
                  name: `streams_ilm_policy_no_phases_${Date.now()}`,
                  phases: {},
                },
              },
            })
            .expect(400);
        });

        it('POST /internal/streams/lifecycle/_policy rejects new policies without a hot phase', async () => {
          await apiClient
            .fetch('POST /internal/streams/lifecycle/_policy', {
              params: {
                query: {},
                body: {
                  name: `streams_ilm_policy_no_hot_${Date.now()}`,
                  phases: {
                    warm: { min_age: '5d', actions: {} },
                  },
                },
              },
            })
            .expect(400);
        });
      });

      describe('ilm policies endpoint', () => {
        const streamName = 'logs.otel.ilm-policy-usage';
        const policyName = `streams_ilm_policy_usage_${Date.now()}`;

        before(async () => {
          await esClient.ilm.putLifecycle({
            name: policyName,
            policy: {
              phases: {
                hot: { actions: { rollover: { max_age: '30m' } } },
              },
            },
          });

          await putStream(apiClient, streamName, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [],
                },
                lifecycle: { ilm: { policy: policyName } },
              },
            },
          });

          // Create at least one backing index to make policy usage derivation meaningful.
          await esClient.indices.rollover({ alias: streamName });
        });

        after(async () => {
          try {
            await esClient.ilm.deleteLifecycle({ name: policyName });
          } catch (e) {
            // ignore cleanup errors
          }
        });

        it('GET /internal/streams/lifecycle/_policies includes policy usage by data streams', async () => {
          const response = await apiClient
            .fetch('GET /internal/streams/lifecycle/_policies')
            .expect(200);

          const policy = (response.body as Array<{ name: string; in_use_by?: unknown }>).find(
            (p) => p.name === policyName
          );

          expect(policy).to.not.be(undefined);

          // Verify the route enriches `in_use_by` and includes the data stream name (derived from backing indices).
          const parsed = policy as unknown as { in_use_by?: { data_streams?: string[] } };
          expect(Array.isArray(parsed.in_use_by?.data_streams)).to.eql(true);
          expect(parsed.in_use_by!.data_streams).to.contain(streamName);
        });
      });
    }

    describe('snapshot repositories endpoint', function () {
      this.tags(['skipServerless']);

      const REPO_NAME = `streams_lifecycle_repo_${Date.now()}`;
      const CLOUD_DEFAULT_REPO_NAME = 'found-snapshots';
      let createdFsRepo = false;

      before(async () => {
        // In self-managed environments we can create an `fs` repository for a deterministic assertion.
        // In Cloud, there is no node-local filesystem path, but Cloud typically has a
        // repository named `found-snapshots` which we can assert on instead.
        try {
          await esClient.snapshot.createRepository({
            name: REPO_NAME,
            repository: {
              type: 'fs',
              settings: {
                location: STREAMS_SNAPSHOT_REPO_PATH,
                compress: true,
              },
            },
            verify: true,
          });
          createdFsRepo = true;
        } catch (e) {
          createdFsRepo = false;
        }
      });

      after(async () => {
        if (!createdFsRepo) return;
        try {
          await esClient.snapshot.deleteRepository({ name: REPO_NAME });
        } catch (e) {
          // ignore cleanup errors
        }
      });

      it('GET /internal/streams/lifecycle/_snapshot_repositories lists repositories', async () => {
        const response = await apiClient
          .fetch('GET /internal/streams/lifecycle/_snapshot_repositories')
          .expect(200);

        expect(response.body).to.have.property('repositories');

        const repositories = response.body.repositories as Array<{ name: string; type: string }>;
        expect(Array.isArray(repositories)).to.eql(true);
        expect(
          repositories.every((r) => typeof r.name === 'string' && typeof r.type === 'string')
        ).to.eql(true);

        // In case there are no repositories, we return early.
        if (repositories.length === 0) {
          return;
        }

        if (createdFsRepo) {
          const repo = repositories.find((r) => r.name === REPO_NAME);
          expect(repo).to.not.be(undefined);
          expect(repo?.type).to.be('fs');
          return;
        }

        const cloudRepo = repositories.find((r) => r.name === CLOUD_DEFAULT_REPO_NAME);
        if (cloudRepo) {
          expect(cloudRepo.type).to.not.be('');
          return;
        }

        // Fallback: assert we got at least one meaningful repository entry.
        expect(repositories.some((r) => r.type !== '')).to.eql(true);
      });
    });
  });
}
