/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { ElasticsearchRole } from '.';
import type { KibanaFeature } from '../../../../../../features/common';
import { ALL_SPACES_ID, GLOBAL_RESOURCE } from '../../../../../common/constants';
import { PrivilegeSerializer } from '../../../../authorization/privilege_serializer';
import { ResourceSerializer } from '../../../../authorization/resource_serializer';

/**
 * Elasticsearch specific portion of the role definition.
 * See more details at https://www.elastic.co/guide/en/elasticsearch/reference/master/security-api.html#security-role-apis.
 */
const elasticsearchRoleSchema = schema.object({
  /**
   * An optional list of cluster privileges. These privileges define the cluster level actions that
   * users with this role are able to execute
   */
  cluster: schema.maybe(schema.arrayOf(schema.string())),

  /**
   * An optional list of indices permissions entries.
   */
  indices: schema.maybe(
    schema.arrayOf(
      schema.object({
        /**
         * Required list of indices (or index name patterns) to which the permissions in this
         * entry apply.
         */
        names: schema.arrayOf(schema.string(), { minSize: 1 }),

        /**
         * An optional set of the document fields that the owners of the role have read access to.
         */
        field_security: schema.maybe(
          schema.recordOf(
            schema.oneOf([schema.literal('grant'), schema.literal('except')]),
            schema.arrayOf(schema.string())
          )
        ),

        /**
         * Required list of the index level privileges that the owners of the role have on the
         * specified indices.
         */
        privileges: schema.arrayOf(schema.string(), { minSize: 1 }),

        /**
         * An optional search query that defines the documents the owners of the role have read access
         * to. A document within the specified indices must match this query in order for it to be
         * accessible by the owners of the role.
         */
        query: schema.maybe(schema.string()),

        /**
         * An optional flag used to indicate if index pattern wildcards or regexps should cover
         * restricted indices.
         */
        allow_restricted_indices: schema.maybe(schema.boolean()),
      })
    )
  ),

  /**
   * An optional list of users that the owners of this role can impersonate.
   */
  run_as: schema.maybe(schema.arrayOf(schema.string())),
});

const allSpacesSchema = schema.arrayOf(schema.literal(GLOBAL_RESOURCE), {
  minSize: 1,
  maxSize: 1,
});

/**
 * Schema for the list of space IDs used within Kibana specific role definition.
 */
const spacesSchema = schema.oneOf(
  [
    allSpacesSchema,
    schema.arrayOf(
      schema.string({
        validate(value) {
          if (!/^[a-z0-9_-]+$/.test(value)) {
            return `must be lower case, a-z, 0-9, '_', and '-' are allowed`;
          }
        },
      })
    ),
  ],
  { defaultValue: [GLOBAL_RESOURCE] }
);

const FEATURE_NAME_VALUE_REGEX = /^[a-zA-Z0-9_-]+$/;

type PutPayloadSchemaType = TypeOf<ReturnType<typeof getPutPayloadSchema>>;
export function getPutPayloadSchema(
  getBasePrivilegeNames: () => { global: string[]; space: string[] }
) {
  return schema.object({
    /**
     * An optional meta-data dictionary. Within the metadata, keys that begin with _ are reserved
     * for system usage.
     */
    metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),

    /**
     * Elasticsearch specific portion of the role definition.
     */
    elasticsearch: elasticsearchRoleSchema,

    /**
     * Kibana specific portion of the role definition. It's represented as a list of base and/or
     * feature Kibana privileges. None of the entries should apply to the same spaces.
     */
    kibana: schema.maybe(
      schema.arrayOf(
        schema.object(
          {
            /**
             * An optional list of space IDs to which the permissions in this entry apply. If not
             * specified it defaults to special "global" space ID (all spaces).
             */
            spaces: spacesSchema,

            /**
             * An optional list of Kibana base privileges. If this entry applies to special "global"
             * space (all spaces) then specified base privileges should be within known base "global"
             * privilege list, otherwise - within known "space" privilege list. Base privileges
             * definition isn't allowed when feature privileges are defined and required otherwise.
             */
            base: schema.maybe(
              schema.conditional(
                schema.siblingRef('spaces'),
                allSpacesSchema,
                schema.arrayOf(
                  schema.string({
                    validate(value) {
                      const globalPrivileges = getBasePrivilegeNames().global;
                      if (!globalPrivileges.some((privilege) => privilege === value)) {
                        return `unknown global privilege "${value}", must be one of [${globalPrivileges}]`;
                      }
                    },
                  })
                ),
                schema.arrayOf(
                  schema.string({
                    validate(value) {
                      const spacePrivileges = getBasePrivilegeNames().space;
                      if (!spacePrivileges.some((privilege) => privilege === value)) {
                        return `unknown space privilege "${value}", must be one of [${spacePrivileges}]`;
                      }
                    },
                  })
                )
              )
            ),

            /**
             * An optional dictionary of Kibana feature privileges where the key is the ID of the
             * feature and the value is a list of feature specific privilege IDs. Both feature and
             * privilege IDs should consist of allowed set of characters. Feature privileges
             * definition isn't allowed when base privileges are defined and required otherwise.
             */
            feature: schema.maybe(
              schema.recordOf(
                schema.string({
                  validate(value) {
                    if (!FEATURE_NAME_VALUE_REGEX.test(value)) {
                      return `only a-z, A-Z, 0-9, '_', and '-' are allowed`;
                    }
                  },
                }),
                schema.arrayOf(
                  schema.string({
                    validate(value) {
                      if (!FEATURE_NAME_VALUE_REGEX.test(value)) {
                        return `only a-z, A-Z, 0-9, '_', and '-' are allowed`;
                      }
                    },
                  })
                )
              )
            ),
          },
          {
            validate(value) {
              if (
                (value.base === undefined || value.base.length === 0) &&
                (value.feature === undefined || Object.values(value.feature).flat().length === 0)
              ) {
                return 'either [base] or [feature] is expected, but none of them specified';
              }

              if (
                value.base !== undefined &&
                value.base.length > 0 &&
                value.feature !== undefined &&
                Object.keys(value.feature).length > 0
              ) {
                return `definition of [feature] isn't allowed when non-empty [base] is defined.`;
              }
            },
          }
        ),
        {
          validate(value) {
            for (const [indexA, valueA] of value.entries()) {
              for (const valueB of value.slice(indexA + 1)) {
                const spaceIntersection = _.intersection(valueA.spaces, valueB.spaces);
                if (spaceIntersection.length !== 0) {
                  return `more than one privilege is applied to the following spaces: [${spaceIntersection}]`;
                }
              }
            }
          },
        }
      )
    ),
  });
}

export const transformPutPayloadToElasticsearchRole = (
  rolePayload: PutPayloadSchemaType,
  application: string,
  allExistingApplications: ElasticsearchRole['applications'] = []
) => {
  const {
    elasticsearch = { cluster: undefined, indices: undefined, run_as: undefined },
    kibana = [],
  } = rolePayload;
  const otherApplications = allExistingApplications.filter(
    (roleApplication) => roleApplication.application !== application
  );

  return {
    metadata: rolePayload.metadata,
    cluster: elasticsearch.cluster || [],
    indices: elasticsearch.indices || [],
    run_as: elasticsearch.run_as || [],
    applications: [
      ...transformPrivilegesToElasticsearchPrivileges(application, kibana),
      ...otherApplications,
    ],
  } as Omit<ElasticsearchRole, 'name'>;
};

const transformPrivilegesToElasticsearchPrivileges = (
  application: string,
  kibanaPrivileges: PutPayloadSchemaType['kibana'] = []
) => {
  return kibanaPrivileges.map(({ base, feature, spaces }) => {
    if (spaces.length === 1 && spaces[0] === GLOBAL_RESOURCE) {
      return {
        privileges: [
          ...(base
            ? base.map((privilege) => PrivilegeSerializer.serializeGlobalBasePrivilege(privilege))
            : []),
          ...(feature
            ? Object.entries(feature)
                .map(([featureName, featurePrivileges]) =>
                  featurePrivileges.map((privilege) =>
                    PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                  )
                )
                .flat()
            : []),
        ],
        application,
        resources: [GLOBAL_RESOURCE],
      };
    }

    return {
      privileges: [
        ...(base
          ? base.map((privilege) => PrivilegeSerializer.serializeSpaceBasePrivilege(privilege))
          : []),
        ...(feature
          ? Object.entries(feature)
              .map(([featureName, featurePrivileges]) =>
                featurePrivileges.map((privilege) =>
                  PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                )
              )
              .flat()
          : []),
      ],
      application,
      resources: (spaces as string[]).map((resource) =>
        ResourceSerializer.serializeSpaceResource(resource)
      ),
    };
  });
};

export const validateKibanaPrivileges = (
  kibanaFeatures: KibanaFeature[],
  kibanaPrivileges: PutPayloadSchemaType['kibana']
) => {
  const validationErrors = (kibanaPrivileges ?? []).flatMap((priv) => {
    const forAllSpaces = priv.spaces.includes(ALL_SPACES_ID);

    return Object.entries(priv.feature ?? {}).flatMap(([featureId, feature]) => {
      const errors: string[] = [];
      const kibanaFeature = kibanaFeatures.find((f) => f.id === featureId);
      if (!kibanaFeature) return errors;

      if (feature.includes('all')) {
        if (kibanaFeature.privileges?.all.disabled) {
          errors.push(`Feature [${featureId}] does not support privilege [all].`);
        }

        if (kibanaFeature.privileges?.all.requireAllSpaces && !forAllSpaces) {
          errors.push(
            `Feature privilege [${featureId}.all] requires all spaces to be selected but received [${priv.spaces.join(
              ','
            )}]`
          );
        }
      }

      if (feature.includes('read')) {
        if (kibanaFeature.privileges?.read.disabled) {
          errors.push(`Feature [${featureId}] does not support privilege [read].`);
        }

        if (kibanaFeature.privileges?.read.requireAllSpaces && !forAllSpaces) {
          errors.push(
            `Feature privilege [${featureId}.read] requires all spaces to be selected but received [${priv.spaces.join(
              ','
            )}]`
          );
        }
      }

      return errors;
    });
  });

  return { validationErrors };
};
