/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import {
  ConfigDeprecationProvider,
  ConfigDeprecation,
  DeprecationsDetails,
  GetDeprecationsContext,
} from '@kbn/core/server';
import {
  TIMESTAMP_FIELD,
  TIEBREAKER_FIELD,
  CONTAINER_FIELD,
  HOST_FIELD,
  POD_FIELD,
} from '../common/constants';
import { InfraSources } from './lib/sources';

const deprecatedFieldMessage = (fieldName: string, defaultValue: string, configNames: string[]) =>
  i18n.translate('xpack.infra.deprecations.deprecatedFieldDescription', {
    defaultMessage:
      'Configuring the "{fieldName}" field has been deprecated and will be removed in 8.0.0. This plugin is designed to work with ECS, and expects this field to have a value of `{defaultValue}`. It has a different value configured in Source {configCount, plural, one {Configuration} other {Configurations}}: {configNames}',
    values: {
      fieldName,
      defaultValue,
      configNames: configNames.join(', '),
      configCount: configNames.length,
    },
  });

const DEFAULT_VALUES = {
  timestamp: TIMESTAMP_FIELD,
  tiebreaker: TIEBREAKER_FIELD,
  container: CONTAINER_FIELD,
  host: HOST_FIELD,
  pod: POD_FIELD,
};

const FIELD_DEPRECATION_FACTORIES: Record<string, (configNames: string[]) => DeprecationsDetails> =
  {
    timestamp: (configNames) => ({
      level: 'critical',
      title: i18n.translate('xpack.infra.deprecations.timestampFieldTitle', {
        defaultMessage: 'Source configuration field "timestamp" is deprecated.',
      }),
      message: deprecatedFieldMessage(
        i18n.translate('xpack.infra.deprecations.timestampFieldName', {
          defaultMessage: 'timestamp',
        }),
        DEFAULT_VALUES.timestamp,
        configNames
      ),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.infra.deprecations.timestampAdjustIndexing', {
            defaultMessage: 'Adjust your indexing to use "{field}" as a timestamp.',
            values: { field: '@timestamp' },
          }),
        ],
      },
    }),
    tiebreaker: (configNames) => ({
      level: 'critical',
      title: i18n.translate('xpack.infra.deprecations.tiebreakerFieldTitle', {
        defaultMessage: 'Source configuration field "tiebreaker" is deprecated.',
      }),
      message: deprecatedFieldMessage(
        i18n.translate('xpack.infra.deprecations.tiebreakerFieldName', {
          defaultMessage: 'tiebreaker',
        }),
        DEFAULT_VALUES.tiebreaker,
        configNames
      ),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.infra.deprecations.tiebreakerAdjustIndexing', {
            defaultMessage: 'Adjust your indexing to use "{field}" as a tiebreaker.',
            values: { field: '_doc' },
          }),
        ],
      },
    }),
    host: (configNames) => ({
      level: 'critical',
      title: i18n.translate('xpack.infra.deprecations.hostnameFieldTitle', {
        defaultMessage: 'Source configuration field "host name" is deprecated.',
      }),
      message: deprecatedFieldMessage(
        i18n.translate('xpack.infra.deprecations.hostnameFieldName', {
          defaultMessage: 'host name',
        }),
        DEFAULT_VALUES.host,
        configNames
      ),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.infra.deprecations.hostAdjustIndexing', {
            defaultMessage: 'Adjust your indexing to identify hosts using "{field}"',
            values: { field: 'host.name' },
          }),
        ],
      },
    }),
    pod: (configNames) => ({
      level: 'critical',
      title: i18n.translate('xpack.infra.deprecations.podIdFieldTitle', {
        defaultMessage: 'Source configuration field "pod ID" is deprecated.',
      }),
      message: deprecatedFieldMessage(
        i18n.translate('xpack.infra.deprecations.podIdFieldName', { defaultMessage: 'pod ID' }),
        DEFAULT_VALUES.pod,
        configNames
      ),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.infra.deprecations.podAdjustIndexing', {
            defaultMessage: 'Adjust your indexing to identify Kubernetes pods using "{field}"',
            values: { field: 'kubernetes.pod.uid' },
          }),
        ],
      },
    }),
    container: (configNames) => ({
      level: 'critical',
      title: i18n.translate('xpack.infra.deprecations.containerIdFieldTitle', {
        defaultMessage: 'Source configuration field "container ID" is deprecated.',
      }),
      message: deprecatedFieldMessage(
        i18n.translate('xpack.infra.deprecations.containerIdFieldName', {
          defaultMessage: 'container ID',
        }),
        DEFAULT_VALUES.container,
        configNames
      ),
      correctiveActions: {
        manualSteps: [
          i18n.translate('xpack.infra.deprecations.containerAdjustIndexing', {
            defaultMessage: 'Adjust your indexing to identify Docker containers using "{field}"',
            values: { field: 'container.id' },
          }),
        ],
      },
    }),
  };

export const configDeprecations: ConfigDeprecationProvider = ({ deprecate }) => [
  ...Object.keys(FIELD_DEPRECATION_FACTORIES).map(
    (key): ConfigDeprecation =>
      (completeConfig, rootPath, addDeprecation) => {
        const configuredValue = get(completeConfig, `xpack.infra.sources.default.fields.${key}`);
        if (typeof configuredValue === 'undefined') {
          return completeConfig;
        }
        addDeprecation({
          title: i18n.translate('xpack.infra.deprecations.deprecatedFieldConfigTitle', {
            defaultMessage: '"{fieldKey}" is deprecated.',
            values: {
              fieldKey: key,
            },
          }),
          message: i18n.translate('xpack.infra.deprecations.deprecatedFieldConfigDescription', {
            defaultMessage:
              'Configuring "xpack.infra.sources.default.fields.{fieldKey}" has been deprecated and will be removed in 8.0.0.',
            values: {
              fieldKey: key,
            },
          }),
          level: 'warning',
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.infra.deprecations.removeConfigField', {
                defaultMessage:
                  'Remove "xpack.infra.sources.default.fields.{fieldKey}" from your Kibana configuration.',
                values: { fieldKey: key },
              }),
            ],
          },
        } as Parameters<typeof addDeprecation>[0]);

        return completeConfig;
      }
  ),
];

export const getInfraDeprecationsFactory =
  (sources: InfraSources) =>
  async ({ savedObjectsClient }: GetDeprecationsContext) => {
    const deprecatedFieldsToSourceConfigMap: Map<string, string[]> = new Map();
    const sourceConfigurations = await sources.getAllSourceConfigurations(savedObjectsClient);

    for (const { configuration } of sourceConfigurations) {
      const { name, fields } = configuration;
      for (const [key, defaultValue] of Object.entries(DEFAULT_VALUES)) {
        const configuredValue = Reflect.get(fields, key);
        if (configuredValue !== defaultValue) {
          const affectedConfigNames = deprecatedFieldsToSourceConfigMap.get(key) ?? [];
          affectedConfigNames.push(name);
          deprecatedFieldsToSourceConfigMap.set(key, affectedConfigNames);
        }
      }
    }

    const deprecations: DeprecationsDetails[] = [];
    if (deprecatedFieldsToSourceConfigMap.size > 0) {
      for (const [fieldName, affectedConfigNames] of deprecatedFieldsToSourceConfigMap.entries()) {
        const deprecationFactory = Reflect.get(FIELD_DEPRECATION_FACTORIES, fieldName);
        deprecations.push(deprecationFactory(affectedConfigNames));
      }
    }

    return deprecations;
  };
