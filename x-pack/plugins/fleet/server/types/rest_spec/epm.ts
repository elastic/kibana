/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { ExperimentalDataStreamFeaturesSchema } from '../models/package_policy';

export const GetCategoriesRequestSchema = {
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
    experimental: schema.maybe(schema.boolean()), // deprecated
    include_policy_templates: schema.maybe(schema.boolean()),
  }),
};

const CategorySummaryItemSchema = schema.object({
  id: schema.string(),
  title: schema.string(),
  count: schema.number(),
  parent_id: schema.maybe(schema.string()),
  parent_title: schema.maybe(schema.string()),
});

export const GetCategoriesResponseSchema = schema.object({
  items: schema.arrayOf(CategorySummaryItemSchema),
  response: schema.maybe(
    schema.arrayOf(CategorySummaryItemSchema.extends({}, { meta: { deprecated: true } }))
  ),
});

export const GetPackagesRequestSchema = {
  query: schema.object({
    category: schema.maybe(schema.string()),
    prerelease: schema.maybe(schema.boolean()),
    experimental: schema.maybe(schema.boolean()), // deprecated
    excludeInstallStatus: schema.maybe(schema.boolean({ defaultValue: false })),
  }),
};

export const KibanaAssetReferenceSchema = schema.object({
  id: schema.string(),
  originId: schema.maybe(schema.string()),
  type: schema.oneOf([
    schema.literal('dashboard'),
    schema.literal('lens'),
    schema.literal('visualization'),
    schema.literal('search'),
    schema.literal('index-pattern'),
    schema.literal('map'),
    schema.literal('ml-module'),
    schema.literal('security-rule'),
    schema.literal('csp-rule-template'),
    schema.literal('osquery-pack-asset'),
    schema.literal('osquery-saved-query'),
    schema.literal('tag'),
  ]),
});

export const EsAssetReferenceSchema = schema.object({
  id: schema.string(),
  type: schema.oneOf([
    schema.literal('index'),
    schema.literal('index_template'),
    schema.literal('component_template'),
    schema.literal('ingest_pipeline'),
    schema.literal('ilm_policy'),
    schema.literal('data_stream_ilm_policy'),
    schema.literal('transform'),
    schema.literal('ml_model'),
  ]),
  deferred: schema.maybe(schema.boolean()),
  version: schema.maybe(schema.string()),
});

export const InstallationInfoSchema = schema.object({
  type: schema.string(),
  created_at: schema.maybe(schema.string()),
  updated_at: schema.maybe(schema.string()),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
  installed_kibana: schema.arrayOf(KibanaAssetReferenceSchema),
  additional_spaces_installed_kibana: schema.maybe(
    schema.recordOf(schema.string(), schema.arrayOf(KibanaAssetReferenceSchema))
  ),
  installed_es: schema.arrayOf(EsAssetReferenceSchema),
  name: schema.string(),
  version: schema.string(),
  install_status: schema.oneOf([
    schema.literal('installed'),
    schema.literal('installing'),
    schema.literal('install_failed'),
  ]),
  install_source: schema.oneOf([
    schema.literal('registry'),
    schema.literal('upload'),
    schema.literal('bundled'),
    schema.literal('custom'),
  ]),
  installed_kibana_space_id: schema.maybe(schema.string()),
  install_format_schema_version: schema.maybe(schema.string()),
  verification_status: schema.oneOf([
    schema.literal('unverified'),
    schema.literal('verified'),
    schema.literal('unknown'),
  ]),
  verification_key_id: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  experimental_data_stream_features: schema.maybe(ExperimentalDataStreamFeaturesSchema),
  latest_install_failed_attempts: schema.maybe(
    schema.arrayOf(
      schema.object({
        created_at: schema.string(),
        target_version: schema.string(),
        error: schema.object({
          name: schema.string(),
          message: schema.string(),
          stack: schema.maybe(schema.string()),
        }),
      })
    )
  ),
  latest_executed_state: schema.maybe(
    schema.object({
      name: schema.string(),
      started_at: schema.string(),
      error: schema.maybe(schema.string()),
    })
  ),
});

const PackageIconSchema = schema.object({
  path: schema.maybe(schema.string()),
  src: schema.string(),
  title: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  size: schema.maybe(schema.string()),
  dark_mode: schema.maybe(schema.boolean()),
});

export const PackageInfoSchema = schema
  .object({
    status: schema.maybe(schema.string()),
    savedObject: schema.maybe(schema.any({ meta: { deprecated: true } })),
    installationInfo: schema.maybe(InstallationInfoSchema),
    name: schema.string(),
    version: schema.string(),
    description: schema.maybe(schema.string()),
    title: schema.string(),
    icons: schema.maybe(schema.arrayOf(PackageIconSchema)),
    conditions: schema.maybe(
      schema.object({
        kibana: schema.maybe(schema.object({ version: schema.maybe(schema.string()) })),
        elastic: schema.maybe(
          schema.object({
            subscription: schema.maybe(schema.string()),
            capabilities: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      })
    ),
    release: schema.maybe(
      schema.oneOf([schema.literal('ga'), schema.literal('beta'), schema.literal('experimental')])
    ),
    type: schema.maybe(schema.oneOf([schema.literal('integration'), schema.literal('input')])),
    path: schema.maybe(schema.string()),
    download: schema.maybe(schema.string()),
    internal: schema.maybe(schema.boolean()),
    data_streams: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
    policy_templates: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
    categories: schema.maybe(schema.arrayOf(schema.string())),
    owner: schema.maybe(
      schema.object({
        github: schema.maybe(schema.string()),
        type: schema.maybe(
          schema.oneOf([
            schema.literal('elastic'),
            schema.literal('partner'),
            schema.literal('community'),
          ])
        ),
      })
    ),
    readme: schema.maybe(schema.string()),
    signature_path: schema.maybe(schema.string()),
    source: schema.maybe(
      schema.object({
        license: schema.string(),
      })
    ),
    format_version: schema.maybe(schema.string()),
    vars: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
    latestVersion: schema.maybe(schema.string()),
  })
  // sometimes package list response contains extra properties, e.g. installed_kibana
  .extendsDeep({
    unknowns: 'allow',
  });

export const PackageListItemSchema = PackageInfoSchema.extends({
  id: schema.string(),
  integration: schema.maybe(schema.string()),
});

export const GetPackagesResponseSchema = schema.object({
  items: schema.arrayOf(PackageListItemSchema),
  response: schema.maybe(
    schema.arrayOf(PackageListItemSchema.extends({}, { meta: { deprecated: true } }))
  ),
});

export const InstalledPackageSchema = schema.object({
  name: schema.string(),
  version: schema.string(),
  status: schema.string(),
  title: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
  icons: schema.maybe(schema.arrayOf(PackageIconSchema)),
  dataStreams: schema.arrayOf(
    schema.object({
      name: schema.string(),
      title: schema.string(),
    })
  ),
});

export const GetInstalledPackagesResponseSchema = schema.object({
  items: schema.arrayOf(InstalledPackageSchema),
  total: schema.number(),
  searchAfter: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.string(),
        schema.number(),
        schema.boolean(),
        schema.literal(null),
        schema.any(),
      ])
    )
  ),
});

export const GetLimitedPackagesResponseSchema = schema.object({
  items: schema.arrayOf(schema.string()),
  response: schema.maybe(schema.arrayOf(schema.string(), { meta: { deprecated: true } })),
});

export const GetStatsResponseSchema = schema.object({
  response: schema.object({
    agent_policy_count: schema.number(),
  }),
});

export const GetInputsResponseSchema = schema.oneOf([
  schema.string(),
  schema.object({
    inputs: schema.arrayOf(
      schema.object({
        id: schema.string(),
        type: schema.string(),
        streams: schema.maybe(
          schema.arrayOf(
            schema
              .object({
                id: schema.string(),
                data_stream: schema.object({
                  dataset: schema.string(),
                  type: schema.maybe(schema.string()),
                }),
              })
              .extendsDeep({
                unknowns: 'allow',
              })
          )
        ),
      })
    ),
  }),
]);

export const GetFileResponseSchema = schema.any();

export const PackageMetadataSchema = schema.object({
  has_policies: schema.boolean(),
});

export const GetPackageInfoSchema = PackageInfoSchema.extends({
  assets: schema.recordOf(schema.string(), schema.maybe(schema.any())),
  notice: schema.maybe(schema.string()),
  licensePath: schema.maybe(schema.string()),
  keepPoliciesUpToDate: schema.maybe(schema.boolean()),
  license: schema.maybe(schema.string()),
  screenshots: schema.maybe(schema.arrayOf(PackageIconSchema)),
  elasticsearch: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  agent: schema.maybe(
    schema.object({
      privileges: schema.maybe(
        schema.object({
          root: schema.maybe(schema.boolean()),
        })
      ),
    })
  ),
  asset_tags: schema.maybe(
    schema.arrayOf(
      schema.object({
        text: schema.string(),
        asset_types: schema.maybe(schema.arrayOf(schema.string())),
        asset_ids: schema.maybe(schema.arrayOf(schema.string())),
      })
    )
  ),
});

export const GetInfoResponseSchema = schema.object({
  item: GetPackageInfoSchema,
  metadata: schema.maybe(PackageMetadataSchema),
  response: schema.maybe(GetPackageInfoSchema.extends({}, { meta: { deprecated: true } })),
});

export const UpdatePackageResponseSchema = schema.object({
  item: GetPackageInfoSchema,
  response: schema.maybe(GetPackageInfoSchema.extends({}, { meta: { deprecated: true } })),
});

export const AssetReferenceSchema = schema.oneOf([
  KibanaAssetReferenceSchema,
  EsAssetReferenceSchema,
]);

export const InstallPackageResponseSchema = schema.object({
  items: schema.arrayOf(AssetReferenceSchema),
  _meta: schema.object({
    install_source: schema.string(),
  }),
  response: schema.maybe(schema.arrayOf(AssetReferenceSchema, { meta: { deprecated: true } })),
});

export const InstallKibanaAssetsResponseSchema = schema.object({
  success: schema.boolean(),
});

export const BulkInstallPackagesResponseItemSchema = schema.oneOf([
  schema.object({
    name: schema.string(),
    version: schema.string(),
    result: schema.object({
      assets: schema.maybe(schema.arrayOf(AssetReferenceSchema)),
      status: schema.maybe(
        schema.oneOf([schema.literal('installed'), schema.literal('already_installed')])
      ),
      error: schema.maybe(schema.any()),
      installType: schema.string(),
      installSource: schema.maybe(schema.string()),
    }),
  }),
  schema.object({
    name: schema.string(),
    statusCode: schema.number(),
    error: schema.oneOf([schema.string(), schema.any()]),
  }),
]);

export const BulkInstallPackagesFromRegistryResponseSchema = schema.object({
  items: schema.arrayOf(BulkInstallPackagesResponseItemSchema),
  response: schema.maybe(
    schema.arrayOf(BulkInstallPackagesResponseItemSchema, { meta: { deprecated: true } })
  ),
});

export const DeletePackageResponseSchema = schema.object({
  items: schema.arrayOf(AssetReferenceSchema),
  response: schema.maybe(schema.arrayOf(AssetReferenceSchema, { meta: { deprecated: true } })),
});

export const GetVerificationKeyIdResponseSchema = schema.object({
  id: schema.oneOf([schema.string(), schema.literal(null)]),
});

export const GetDataStreamsResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      name: schema.string(),
    })
  ),
});

export const GetBulkAssetsResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      appLink: schema.maybe(schema.string()),
      id: schema.string(),
      type: schema.string(),
      updatedAt: schema.maybe(schema.string()),
      attributes: schema.object({
        service: schema.maybe(schema.string()),
        title: schema.maybe(schema.string()),
        description: schema.maybe(schema.string()),
      }),
    })
  ),
});

export const ReauthorizeTransformResponseSchema = schema.arrayOf(
  schema.object({
    transformId: schema.string(),
    success: schema.boolean(),
    error: schema.oneOf([schema.literal(null), schema.any()]),
  })
);

export const GetInstalledPackagesRequestSchema = {
  query: schema.object({
    dataStreamType: schema.maybe(
      schema.oneOf([
        schema.literal('logs'),
        schema.literal('metrics'),
        schema.literal('traces'),
        schema.literal('synthetics'),
        schema.literal('profiling'),
      ])
    ),
    showOnlyActiveDataStreams: schema.maybe(schema.boolean()),
    nameQuery: schema.maybe(schema.string()),
    searchAfter: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
    perPage: schema.number({ defaultValue: 15 }),
    sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      defaultValue: 'asc',
    }),
  }),
};

export const GetDataStreamsRequestSchema = {
  query: schema.object({
    type: schema.maybe(
      schema.oneOf([
        schema.literal('logs'),
        schema.literal('metrics'),
        schema.literal('traces'),
        schema.literal('synthetics'),
        schema.literal('profiling'),
      ])
    ),
    datasetQuery: schema.maybe(schema.string()),
    sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      defaultValue: 'asc',
    }),
    uncategorisedOnly: schema.boolean({ defaultValue: false }),
  }),
};

export const GetLimitedPackagesRequestSchema = {
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
  }),
};

export const GetFileRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
    filePath: schema.string(),
  }),
};

export const GetInfoRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
  query: schema.object({
    ignoreUnverified: schema.maybe(schema.boolean()),
    prerelease: schema.maybe(schema.boolean()),
    full: schema.maybe(schema.boolean()),
    withMetadata: schema.boolean({ defaultValue: false }),
  }),
};

export const GetBulkAssetsRequestSchema = {
  body: schema.object({
    assetIds: schema.arrayOf(schema.object({ id: schema.string(), type: schema.string() })),
  }),
};

export const GetInfoRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  query: schema.object({
    ignoreUnverified: schema.maybe(schema.boolean()),
    prerelease: schema.maybe(schema.boolean()),
    full: schema.maybe(schema.boolean()),
    withMetadata: schema.boolean({ defaultValue: false }),
  }),
};

export const UpdatePackageRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
  body: schema.object({
    keepPoliciesUpToDate: schema.boolean(),
  }),
};

export const UpdatePackageRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  body: schema.object({
    keepPoliciesUpToDate: schema.boolean(),
  }),
};

export const GetStatsRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
  }),
};

export const InstallPackageFromRegistryRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
    ignoreMappingUpdateErrors: schema.boolean({ defaultValue: false }),
    skipDataStreamRollover: schema.boolean({ defaultValue: false }),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean({ defaultValue: false }),
      ignore_constraints: schema.boolean({ defaultValue: false }),
    })
  ),
};

export const ReauthorizeTransformRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.maybe(schema.string()),
  }),
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
  }),
  body: schema.object({
    transforms: schema.arrayOf(schema.object({ transformId: schema.string() })),
  }),
};

export const InstallPackageFromRegistryRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
    ignoreMappingUpdateErrors: schema.boolean({ defaultValue: false }),
    skipDataStreamRollover: schema.boolean({ defaultValue: false }),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};

export const BulkInstallPackagesFromRegistryRequestSchema = {
  query: schema.object({
    prerelease: schema.maybe(schema.boolean()),
  }),
  body: schema.object({
    packages: schema.arrayOf(
      schema.oneOf([
        schema.string(),
        schema.object({
          name: schema.string(),
          version: schema.string(),
          prerelease: schema.maybe(schema.boolean()),
        }),
      ]),
      { minSize: 1 }
    ),
    force: schema.boolean({ defaultValue: false }),
  }),
};

export const InstallPackageByUploadRequestSchema = {
  query: schema.object({
    ignoreMappingUpdateErrors: schema.boolean({ defaultValue: false }),
    skipDataStreamRollover: schema.boolean({ defaultValue: false }),
  }),
  body: schema.buffer(),
};

export const CreateCustomIntegrationRequestSchema = {
  body: schema.object({
    integrationName: schema.string(),
    datasets: schema.arrayOf(
      schema.object({
        name: schema.string(),
        type: schema.oneOf([
          schema.literal('logs'),
          schema.literal('metrics'),
          schema.literal('traces'),
          schema.literal('synthetics'),
          schema.literal('profiling'),
        ]),
      })
    ),
    force: schema.maybe(schema.boolean()),
  }),
};

export const DeletePackageRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
  }),
  query: schema.object({
    force: schema.maybe(schema.boolean()),
  }),
  // body is deprecated on delete request
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};

export const InstallKibanaAssetsRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
  }),
  // body is deprecated on delete request
  body: schema.nullable(
    schema.object({
      force: schema.maybe(schema.boolean()),
    })
  ),
};

export const DeleteKibanaAssetsRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
  }),
};

export const DeletePackageRequestSchemaDeprecated = {
  params: schema.object({
    pkgkey: schema.string(),
  }),
  body: schema.nullable(
    schema.object({
      force: schema.boolean(),
    })
  ),
};

export const GetInputsRequestSchema = {
  params: schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
  }),
  query: schema.object({
    format: schema.oneOf([schema.literal('json'), schema.literal('yml'), schema.literal('yaml')], {
      defaultValue: 'json',
    }),
    prerelease: schema.maybe(schema.boolean()),
    ignoreUnverified: schema.maybe(schema.boolean()),
  }),
};
