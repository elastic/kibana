/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import { KibanaRequest } from '@kbn/core/server';
import { RegistryVarsEntry } from '@kbn/fleet-plugin/common';
import {
  POLICY_ELASTIC_AGENT_ON_CLOUD,
  INPUT_VAR_NAME_TO_SCHEMA_PATH,
} from '../../../common/fleet';
import {
  APMPluginSetupDependencies,
  APMPluginStartDependencies,
} from '../../types';
import { getLatestApmPackage } from './get_latest_apm_package';
import { translateLegacySchemaPaths } from './translate_legacy_schema_paths';

export async function getApmPackagePolicyDefinition({
  apmServerSchema,
  cloudPluginSetup,
  fleetPluginStart,
  request,
}: {
  apmServerSchema: Record<string, any>;
  cloudPluginSetup: APMPluginSetupDependencies['cloud'];
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  request: KibanaRequest;
}) {
  const latestApmPackage = await getLatestApmPackage({
    fleetPluginStart,
    request,
  });

  return {
    name: 'Elastic APM',
    namespace: 'default',
    enabled: true,
    policy_id: POLICY_ELASTIC_AGENT_ON_CLOUD,
    output_id: '',
    inputs: [
      {
        type: 'apm',
        enabled: true,
        streams: [],
        vars: getApmPackageInputVars({
          policyTemplateInputVars: latestApmPackage.policyTemplateInputVars,
          apmServerSchema: translateLegacySchemaPaths(apmServerSchema),
          cloudPluginSetup,
        }),
      },
    ],
    package: {
      name: latestApmPackage.package.name,
      version: latestApmPackage.package.version,
      title: latestApmPackage.package.title,
    },
  };
}

function getApmPackageInputVars({
  policyTemplateInputVars,
  apmServerSchema,
  cloudPluginSetup,
}: {
  policyTemplateInputVars: RegistryVarsEntry[];
  apmServerSchema: Record<string, any>;
  cloudPluginSetup: APMPluginSetupDependencies['cloud'];
}): Record<string, { type: string; value: any }> {
  const overrideValues: Record<string, any> = {
    url: cloudPluginSetup?.apm?.url, // overrides 'apm-server.url' to be the cloud APM host
    rum_allow_origins: ensureValidMultiText(
      apmServerSchema[INPUT_VAR_NAME_TO_SCHEMA_PATH.rum_allow_origins]
    ), // fixes issue where "*" needs to be wrapped in quotes to be parsed as a YAML string
  };

  return policyTemplateInputVars.reduce((acc, registryVarsEntry) => {
    const { name, type, default: defaultValue } = registryVarsEntry;
    return {
      ...acc,
      [name]: {
        type,
        value:
          overrideValues[name] ??
          apmServerSchema[INPUT_VAR_NAME_TO_SCHEMA_PATH[name]] ??
          defaultValue ??
          '',
      },
    };
  }, {});
}

function ensureValidMultiText(textMultiValue: string[] | undefined) {
  if (!textMultiValue) {
    return undefined;
  }
  return textMultiValue.map(escapeInvalidYamlString);
}
function escapeInvalidYamlString(yamlString: string) {
  try {
    yaml.load(yamlString);
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      return `"${yamlString}"`;
    }
  }
  return yamlString;
}
