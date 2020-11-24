/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/sources',
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/sources/status',
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/sources/form_create',
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}/documents`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}/federated_summary`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}/reauth_prepare`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}/settings`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/pre_content_sources/${request.params.id}`,
      })(context, request, response);
    }
  );
}

export function registerAccountPrepareSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/account/sources/{service_type}/prepare',
      validate: {
        params: schema.object({
          service_type: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.service_type}/prepare`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}/searchable`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}/display_settings/config`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/sources/${request.params.id}/display_settings/config`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/org/sources',
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/org/sources/status',
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/org/sources/form_create',
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}/documents`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}/federated_summary`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}/reauth_prepare`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}/settings`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/pre_content_sources/${request.params.id}`,
      })(context, request, response);
    }
  );
}

export function registerOrgPrepareSourcesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/sources/{service_type}/prepare',
      validate: {
        params: schema.object({
          service_type: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.service_type}/prepare`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}/searchable`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}/display_settings/config`,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/sources/${request.params.id}/display_settings/config`,
        body: request.body,
      })(context, request, response);
    }
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/org/settings/connectors',
      })(context, request, response);
    }
  );
}

export function registerOrgSourceOauthConfigurationRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/settings/connectors/{service_type}',
      validate: {
        params: schema.object({
          service_type: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/settings/connectors/${request.params.service_type}`,
      })(context, request, response);
    }
  );

  router.post(
    {
      path: '/api/workplace_search/org/settings/connectors/{service_type}',
      validate: {
        params: schema.object({
          service_type: schema.string(),
        }),
        body: oAuthConfigSchema,
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/settings/connectors/${request.params.service_type}`,
        body: request.body,
      })(context, request, response);
    }
  );

  router.put(
    {
      path: '/api/workplace_search/org/settings/connectors/{service_type}',
      validate: {
        params: schema.object({
          service_type: schema.string(),
        }),
        body: oAuthConfigSchema,
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/settings/connectors/${request.params.service_type}`,
        body: request.body,
      })(context, request, response);
    }
  );

  router.delete(
    {
      path: '/api/workplace_search/org/settings/connectors/{service_type}',
      validate: {
        params: schema.object({
          service_type: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/settings/connectors/${request.params.service_type}`,
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
  registerAccountPreSourceRoute(dependencies);
  registerAccountPrepareSourcesRoute(dependencies);
  registerAccountSourceSearchableRoute(dependencies);
  registerAccountSourceDisplaySettingsConfig(dependencies);
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
  registerOrgSourceOauthConfigurationsRoute(dependencies);
  registerOrgSourceOauthConfigurationRoute(dependencies);
};
