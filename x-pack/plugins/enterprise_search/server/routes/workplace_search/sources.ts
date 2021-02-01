/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

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
  current: schema.number(),
  size: schema.number(),
  total_pages: schema.number(),
  total_results: schema.number(),
});

const oAuthConfigSchema = schema.object({
  base_url: schema.maybe(schema.string()),
  client_id: schema.maybe(schema.string()),
  client_secret: schema.maybe(schema.string()),
  service_type: schema.string(),
  private_key: schema.string(),
  public_key: schema.string(),
  consumer_key: schema.string(),
});

const displayFieldSchema = schema.object({
  fieldName: schema.string(),
  label: schema.string(),
});

const displaySettingsSchema = schema.object({
  titleField: schema.maybe(schema.string()),
  subtitleField: schema.maybe(schema.string()),
  descriptionField: schema.maybe(schema.string()),
  urlField: schema.maybe(schema.string()),
  color: schema.string(),
  urlFieldIsLinkable: schema.boolean(),
  detailFields: schema.oneOf([schema.arrayOf(displayFieldSchema), displayFieldSchema]),
});

export function registerAccountSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/account/sources',
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
      path: '/api/workplace_search/account/sources/status',
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
      path: '/api/workplace_search/account/sources/{id}',
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
      path: '/api/workplace_search/account/sources/{id}',
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
      path: '/api/workplace_search/account/create_source',
      validate: {
        body: schema.object({
          service_type: schema.string(),
          name: schema.maybe(schema.string()),
          login: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
          organizations: schema.maybe(schema.arrayOf(schema.string())),
          indexPermissions: schema.boolean(),
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
      path: '/api/workplace_search/account/sources/{id}/documents',
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
      path: '/api/workplace_search/account/sources/{id}/federated_summary',
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
      path: '/api/workplace_search/account/sources/{id}/reauth_prepare',
      validate: {
        params: schema.object({
          id: schema.string(),
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
      path: '/api/workplace_search/account/sources/{id}/settings',
      validate: {
        body: schema.object({
          content_source: schema.object({
            name: schema.string(),
          }),
        }),
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

export function registerAccountPreSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/account/pre_sources/{id}',
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
      path: '/api/workplace_search/account/sources/{serviceType}/prepare',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
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
      path: '/api/workplace_search/account/sources/{id}/searchable',
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
      path: '/api/workplace_search/account/sources/{id}/display_settings/config',
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
      path: '/api/workplace_search/account/sources/{id}/display_settings/config',
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
      path: '/api/workplace_search/account/sources/{id}/schemas',
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
      path: '/api/workplace_search/account/sources/{id}/schemas',
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
      path: '/api/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}',
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

export function registerAccountSourceReindexJobStatusRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/account/sources/{sourceId}/reindex_job/{jobId}/status',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/sources/:sourceId/reindex_job/:jobId/status',
    })
  );
}

export function registerOrgSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/sources',
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
      path: '/api/workplace_search/org/sources/status',
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
      path: '/api/workplace_search/org/sources/{id}',
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
      path: '/api/workplace_search/org/sources/{id}',
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
      path: '/api/workplace_search/org/create_source',
      validate: {
        body: schema.object({
          service_type: schema.string(),
          name: schema.maybe(schema.string()),
          login: schema.maybe(schema.string()),
          password: schema.maybe(schema.string()),
          organizations: schema.maybe(schema.arrayOf(schema.string())),
          indexPermissions: schema.maybe(schema.boolean()),
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
      path: '/api/workplace_search/org/sources/{id}/documents',
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
      path: '/api/workplace_search/org/sources/{id}/federated_summary',
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
      path: '/api/workplace_search/org/sources/{id}/reauth_prepare',
      validate: {
        params: schema.object({
          id: schema.string(),
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
      path: '/api/workplace_search/org/sources/{id}/settings',
      validate: {
        body: schema.object({
          content_source: schema.object({
            name: schema.string(),
          }),
        }),
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

export function registerOrgPreSourceRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/pre_sources/{id}',
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
      path: '/api/workplace_search/org/sources/{serviceType}/prepare',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
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
      path: '/api/workplace_search/org/sources/{id}/searchable',
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
      path: '/api/workplace_search/org/sources/{id}/display_settings/config',
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
      path: '/api/workplace_search/org/sources/{id}/display_settings/config',
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
      path: '/api/workplace_search/org/sources/{id}/schemas',
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
      path: '/api/workplace_search/org/sources/{id}/schemas',
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
      path: '/api/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}',
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

export function registerOrgSourceReindexJobStatusRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/sources/{sourceId}/reindex_job/{jobId}/status',
      validate: {
        params: schema.object({
          sourceId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/sources/:sourceId/reindex_job/:jobId/status',
    })
  );
}

export function registerOrgSourceOauthConfigurationsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/settings/connectors',
      validate: false,
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
      path: '/api/workplace_search/org/settings/connectors/{serviceType}',
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
      path: '/api/workplace_search/org/settings/connectors/{serviceType}',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
        body: oAuthConfigSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors/:serviceType',
    })
  );

  router.put(
    {
      path: '/api/workplace_search/org/settings/connectors/{serviceType}',
      validate: {
        params: schema.object({
          serviceType: schema.string(),
        }),
        body: oAuthConfigSchema,
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/connectors/:serviceType',
    })
  );

  router.delete(
    {
      path: '/api/workplace_search/org/settings/connectors/{serviceType}',
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

export const registerSourcesRoutes = (dependencies: RouteDependencies) => {
  registerAccountSourcesRoute(dependencies);
  registerAccountSourcesStatusRoute(dependencies);
  registerAccountSourceRoute(dependencies);
  registerAccountCreateSourceRoute(dependencies);
  registerAccountSourceDocumentsRoute(dependencies);
  registerAccountSourceFederatedSummaryRoute(dependencies);
  registerAccountSourceReauthPrepareRoute(dependencies);
  registerAccountSourceSettingsRoute(dependencies);
  registerAccountPreSourceRoute(dependencies);
  registerAccountPrepareSourcesRoute(dependencies);
  registerAccountSourceSearchableRoute(dependencies);
  registerAccountSourceDisplaySettingsConfig(dependencies);
  registerAccountSourceSchemasRoute(dependencies);
  registerAccountSourceReindexJobRoute(dependencies);
  registerAccountSourceReindexJobStatusRoute(dependencies);
  registerOrgSourcesRoute(dependencies);
  registerOrgSourcesStatusRoute(dependencies);
  registerOrgSourceRoute(dependencies);
  registerOrgCreateSourceRoute(dependencies);
  registerOrgSourceDocumentsRoute(dependencies);
  registerOrgSourceFederatedSummaryRoute(dependencies);
  registerOrgSourceReauthPrepareRoute(dependencies);
  registerOrgSourceSettingsRoute(dependencies);
  registerOrgPreSourceRoute(dependencies);
  registerOrgPrepareSourcesRoute(dependencies);
  registerOrgSourceSearchableRoute(dependencies);
  registerOrgSourceDisplaySettingsConfig(dependencies);
  registerOrgSourceSchemasRoute(dependencies);
  registerOrgSourceReindexJobRoute(dependencies);
  registerOrgSourceReindexJobStatusRoute(dependencies);
  registerOrgSourceOauthConfigurationsRoute(dependencies);
  registerOrgSourceOauthConfigurationRoute(dependencies);
};
