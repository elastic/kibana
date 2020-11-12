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
          query: schema.object({
            content_source: schema.object({
              name: schema.string(),
            }),
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
        path: `/ws/pre_content_sources/${request.params.service_type}`,
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
          indexPermissions: schema.boolean(),
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
          query: schema.object({
            content_source: schema.object({
              name: schema.string(),
            }),
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
        path: `/ws/org/pre_content_sources/${request.params.service_type}`,
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
  registerAccountSourceRoute(dependencies);
  registerAccountCreateSourceRoute(dependencies);
  registerAccountSourceDocumentsRoute(dependencies);
  registerAccountSourceFederatedSummaryRoute(dependencies);
  registerAccountSourceReauthPrepareRoute(dependencies);
  registerAccountSourceSettingsRoute(dependencies);
  registerAccountPreSourceRoute(dependencies);
  registerAccountPrepareSourcesRoute(dependencies);
  registerOrgSourceRoute(dependencies);
  registerOrgCreateSourceRoute(dependencies);
  registerOrgSourceDocumentsRoute(dependencies);
  registerOrgSourceFederatedSummaryRoute(dependencies);
  registerOrgSourceReauthPrepareRoute(dependencies);
  registerOrgSourceSettingsRoute(dependencies);
  registerOrgPreSourceRoute(dependencies);
  registerOrgPrepareSourcesRoute(dependencies);
  registerOrgSourceOauthConfigurationsRoute(dependencies);
  registerOrgSourceOauthConfigurationRoute(dependencies);
};
