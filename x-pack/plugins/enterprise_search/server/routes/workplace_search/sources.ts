/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { getOAuthTokenPackageParams } from '../../lib/get_oauth_token_package_params';

import { RouteDependencies } from '../../plugin';

const schemaValuesSchema = schema.recordOf(
  schema.string(),
  schema.oneOf([
    schema.literal('text'),
    schema.literal('number'),
    schema.literal('geolocation'),
    schema.literal('date'),
  ])
);

const pageSchema = schema.object({
  current: schema.nullable(schema.number()),
  size: schema.nullable(schema.number()),
  total_pages: schema.nullable(schema.number()),
  total_results: schema.nullable(schema.number()),
});

const oauthConfigSchema = schema.object({
  base_url: schema.maybe(schema.string()),
  client_id: schema.maybe(schema.string()),
  client_secret: schema.maybe(schema.string()),
  external_connector_api_key: schema.maybe(schema.string()),
  external_connector_url: schema.maybe(schema.string()),
  service_type: schema.string(),
  private_key: schema.maybe(schema.string()),
  public_key: schema.maybe(schema.string()),
  consumer_key: schema.maybe(schema.string()),
});

const externalConnectorSchema = schema.object({
  url: schema.string(),
  api_key: schema.string(),
  service_type: schema.string(),
});

const postConnectorSchema = schema.oneOf([externalConnectorSchema, oauthConfigSchema]);

const displayFieldSchema = schema.object({
  fieldName: schema.string(),
  label: schema.string(),
});

const displaySettingsSchema = schema.object({
  titleField: schema.maybe(schema.string()),
  subtitleField: schema.nullable(schema.string()),
  descriptionField: schema.nullable(schema.string()),
  urlField: schema.maybe(schema.string()),
  typeField: schema.nullable(schema.string()),
  mediaTypeField: schema.nullable(schema.string()),
  createdByField: schema.nullable(schema.string()),
  updatedByField: schema.nullable(schema.string()),
  color: schema.string(),
  urlFieldIsLinkable: schema.boolean(),
  detailFields: schema.oneOf([schema.arrayOf(displayFieldSchema), displayFieldSchema]),
});

const sourceSettingsSchema = schema.object({
  content_source: schema.object({
    name: schema.maybe(schema.string()),
    private_key: schema.maybe(schema.nullable(schema.string())),
    indexing: schema.maybe(
      schema.object({
        enabled: schema.maybe(schema.boolean()),
        features: schema.maybe(
          schema.object({
            thumbnails: schema.maybe(
              schema.object({
                enabled: schema.boolean(),
              })
            ),
            content_extraction: schema.maybe(
              schema.object({
                enabled: schema.boolean(),
              })
            ),
          })
        ),
        schedule: schema.maybe(
          schema.object({
            full: schema.maybe(schema.string()),
            incremental: schema.maybe(schema.string()),
            delete: schema.maybe(schema.string()),
            permissions: schema.maybe(schema.string()),
            blocked_windows: schema.maybe(
              schema.arrayOf(
                schema.object({
                  job_type: schema.string(),
                  day: schema.string(),
                  start: schema.string(),
                  end: schema.string(),
                })
              )
            ),
          })
        ),
        rules: schema.maybe(
          schema.arrayOf(
            schema.object({
              filter_type: schema.string(),
              exclude: schema.maybe(schema.string()),
              include: schema.maybe(schema.string()),
            })
          )
        ),
      })
    ),
  }),
});

const validateRulesSchema = schema.object({
  rules: schema.maybe(
    schema.arrayOf(
      schema.object({
        filter_type: schema.string(),
        exclude: schema.maybe(schema.string()),
        include: schema.maybe(schema.string()),
      })
    )
  ),
});

// Account routes
export function registerAccountSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources',
    })
  );
}

export function registerAccountSourcesStatusRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/status',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/status',
    })
  );
}

export function registerAccountSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id',
    })
  );

  router.delete(
    {
      path: '/internal/workplace_search/account/sources/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id',
    })
  );
}

export function registerAccountCreateSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/account/create_source',
      validate: {
        body: schema.object({
          service_type: schema.string(),
          name: schema.maybe(schema.string()),
          login: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
          organizations: schema.maybe(schema.arrayOf(schema.string())),
          index_permissions: schema.maybe(schema.boolean()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/form_create',
    })
  );
}

export function registerAccountSourceDocumentsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/account/sources/{id}/documents',
      validate: {
        body: schema.object({
          query: schema.string(),
          page: pageSchema,
        }),
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/documents',
    })
  );
}

export function registerAccountSourceFederatedSummaryRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{id}/federated_summary',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/federated_summary',
    })
  );
}

export function registerAccountSourceReauthPrepareRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{id}/reauth_prepare',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: schema.object({
          kibana_host: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/reauth_prepare',
    })
  );
}

export function registerAccountSourceSettingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.patch(
    {
      path: '/internal/workplace_search/account/sources/{id}/settings',
      validate: {
        body: sourceSettingsSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/settings',
    })
  );
}

export function registerAccountSourceValidateIndexingRulesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/account/sources/{id}/indexing_rules/validate',
      validate: {
        body: validateRulesSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/indexing_rules/validate',
    })
  );
}

export function registerAccountPreSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/pre_sources/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/pre_content_sources/:id',
    })
  );
}

export function registerAccountPrepareSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{serviceType}/prepare',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
        query: schema.object({
          kibana_host: schema.string(),
          subdomain: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:serviceType/prepare',
    })
  );
}

export function registerAccountSourceSearchableRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/internal/workplace_search/account/sources/{id}/searchable',
      validate: {
        body: schema.object({
          searchable: schema.boolean(),
        }),
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/searchable',
    })
  );
}

export function registerAccountSourceDisplaySettingsConfig({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{id}/display_settings/config',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/display_settings/config',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/account/sources/{id}/display_settings/config',
      validate: {
        body: displaySettingsSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/display_settings/config',
    })
  );
}

export function registerAccountSourceSchemasRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{id}/schemas',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/schemas',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/account/sources/{id}/schemas',
      validate: {
        body: schemaValuesSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:id/schemas',
    })
  );
}

export function registerAccountSourceReindexJobRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:sourceId/reindex_job/:jobId',
    })
  );
}

export function registerAccountSourceDownloadDiagnosticsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/account/sources/{sourceId}/download_diagnostics',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:sourceId/download_diagnostics',
      hasJsonResponse: false,
    })
  );
}

// Org routes
export function registerOrgSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources',
    })
  );
}

export function registerOrgSourcesStatusRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/status',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/status',
    })
  );
}

export function registerOrgSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id',
    })
  );

  router.delete(
    {
      path: '/internal/workplace_search/org/sources/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id',
    })
  );
}

export function registerOrgCreateSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/org/create_source',
      validate: {
        body: schema.object({
          service_type: schema.string(),
          name: schema.maybe(schema.string()),
          login: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
          organizations: schema.maybe(schema.arrayOf(schema.string())),
          index_permissions: schema.maybe(schema.boolean()),
          app_id: schema.maybe(schema.string()),
          base_url: schema.maybe(schema.string()),
          private_key: schema.nullable(schema.maybe(schema.string())),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/form_create',
    })
  );
}

export function registerOrgSourceDocumentsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/org/sources/{id}/documents',
      validate: {
        body: schema.object({
          query: schema.string(),
          page: pageSchema,
        }),
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/documents',
    })
  );
}

export function registerOrgSourceFederatedSummaryRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{id}/federated_summary',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/federated_summary',
    })
  );
}

export function registerOrgSourceReauthPrepareRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{id}/reauth_prepare',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: schema.object({
          kibana_host: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/reauth_prepare',
    })
  );
}

export function registerOrgSourceSettingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.patch(
    {
      path: '/internal/workplace_search/org/sources/{id}/settings',
      validate: {
        body: sourceSettingsSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/settings',
    })
  );
}

export function registerOrgSourceValidateIndexingRulesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/org/sources/{id}/indexing_rules/validate',
      validate: {
        body: validateRulesSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/indexing_rules/validate',
    })
  );
}

export function registerOrgPreSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/pre_sources/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/pre_content_sources/:id',
    })
  );
}

export function registerOrgPrepareSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{serviceType}/prepare',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
        query: schema.object({
          kibana_host: schema.string(),
          index_permissions: schema.boolean(),
          subdomain: schema.maybe(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:serviceType/prepare',
    })
  );
}

export function registerOrgSourceSearchableRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/internal/workplace_search/org/sources/{id}/searchable',
      validate: {
        body: schema.object({
          searchable: schema.boolean(),
        }),
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/searchable',
    })
  );
}

export function registerOrgSourceDisplaySettingsConfig({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{id}/display_settings/config',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/display_settings/config',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/org/sources/{id}/display_settings/config',
      validate: {
        body: displaySettingsSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/display_settings/config',
    })
  );
}

export function registerOrgSourceSchemasRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{id}/schemas',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/schemas',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/org/sources/{id}/schemas',
      validate: {
        body: schemaValuesSchema,
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/schemas',
    })
  );
}

export function registerOrgSourceReindexJobRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:sourceId/reindex_job/:jobId',
    })
  );
}

export function registerOrgSourceDownloadDiagnosticsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/sources/{sourceId}/download_diagnostics',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:sourceId/download_diagnostics',
      hasJsonResponse: false,
    })
  );
}

export function registerOrgSourceOauthConfigurationsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/settings/connectors',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/org/settings/connectors',
      validate: {
        body: postConnectorSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors',
    })
  );

  router.put(
    {
      path: '/internal/workplace_search/org/settings/connectors',
      validate: {
        body: oauthConfigSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors',
    })
  );
}

export function registerOrgSourceOauthConfigurationRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors/:serviceType',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
        body: oauthConfigSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors/:serviceType',
    })
  );

  router.put(
    {
      path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
        body: oauthConfigSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors/:serviceType',
    })
  );

  router.delete(
    {
      path: '/internal/workplace_search/org/settings/connectors/{serviceType}',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors/:serviceType',
    })
  );
}

export function registerOrgSourceSynchronizeRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/org/sources/{id}/sync',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:id/sync',
    })
  );
}

// Same route is used for org and account. `state` passes the context.
export function registerOauthConnectorParamsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/sources/create',
      validate: {
        query: schema.object({
          kibana_host: schema.string(),
          code: schema.maybe(schema.string()),
          session_state: schema.maybe(schema.string()),
          authuser: schema.maybe(schema.string()),
          prompt: schema.maybe(schema.string()),
          hd: schema.maybe(schema.string()),
          scope: schema.maybe(schema.string()),
          state: schema.string(),
          oauth_token: schema.maybe(schema.string()),
          oauth_verifier: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/sources/create',
        params: getOAuthTokenPackageParams(request.headers.cookie),
      })(context, request, response);
    }
  );
}

export const registerSourcesRoutes = (dependencies: RouteDependencies) => {
  registerAccountSourcesRoute(dependencies);
  registerAccountSourcesStatusRoute(dependencies);
  registerAccountSourceRoute(dependencies);
  registerAccountCreateSourceRoute(dependencies);
  registerAccountSourceDocumentsRoute(dependencies);
  registerAccountSourceFederatedSummaryRoute(dependencies);
  registerAccountSourceReauthPrepareRoute(dependencies);
  registerAccountSourceSettingsRoute(dependencies);
  registerAccountSourceValidateIndexingRulesRoute(dependencies);
  registerAccountPreSourceRoute(dependencies);
  registerAccountPrepareSourcesRoute(dependencies);
  registerAccountSourceSearchableRoute(dependencies);
  registerAccountSourceDisplaySettingsConfig(dependencies);
  registerAccountSourceSchemasRoute(dependencies);
  registerAccountSourceReindexJobRoute(dependencies);
  registerAccountSourceDownloadDiagnosticsRoute(dependencies);
  registerOrgSourcesRoute(dependencies);
  registerOrgSourcesStatusRoute(dependencies);
  registerOrgSourceRoute(dependencies);
  registerOrgCreateSourceRoute(dependencies);
  registerOrgSourceDocumentsRoute(dependencies);
  registerOrgSourceFederatedSummaryRoute(dependencies);
  registerOrgSourceReauthPrepareRoute(dependencies);
  registerOrgSourceSettingsRoute(dependencies);
  registerOrgSourceValidateIndexingRulesRoute(dependencies);
  registerOrgPreSourceRoute(dependencies);
  registerOrgPrepareSourcesRoute(dependencies);
  registerOrgSourceSearchableRoute(dependencies);
  registerOrgSourceDisplaySettingsConfig(dependencies);
  registerOrgSourceSchemasRoute(dependencies);
  registerOrgSourceReindexJobRoute(dependencies);
  registerOrgSourceDownloadDiagnosticsRoute(dependencies);
  registerOrgSourceOauthConfigurationsRoute(dependencies);
  registerOrgSourceOauthConfigurationRoute(dependencies);
  registerOrgSourceSynchronizeRoute(dependencies);
  registerOauthConnectorParamsRoute(dependencies);
};
