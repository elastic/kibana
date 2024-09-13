/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';

import { getFlattenedObject } from '@kbn/std';

import type { AgentPolicy, OutputType, ValueOf } from '../types';
import {
  FLEET_APM_PACKAGE,
  FLEET_SERVER_PACKAGE,
  FLEET_SYNTHETICS_PACKAGE,
  outputType,
  OUTPUT_TYPES_WITH_PRESET_SUPPORT,
  RESERVED_CONFIG_YML_KEYS,
} from '../constants';

const sameClusterRestrictedPackages = [
  FLEET_SERVER_PACKAGE,
  FLEET_SYNTHETICS_PACKAGE,
  FLEET_APM_PACKAGE,
];

/**
 * Return allowed output type for a given agent policy,
 * Fleet Server and APM cannot use anything else than same cluster ES
 */
export function getAllowedOutputTypeForPolicy(agentPolicy: AgentPolicy): string[] {
  const isRestrictedToSameClusterES =
    agentPolicy.package_policies &&
    agentPolicy.package_policies.some(
      (p) => p.package?.name && sameClusterRestrictedPackages.includes(p.package?.name)
    );

  if (isRestrictedToSameClusterES) {
    return [outputType.Elasticsearch];
  }

  return Object.values(outputType);
}

export function getAllowedOutputTypesForIntegration(packageName: string): string[] {
  const isRestrictedToSameClusterES = sameClusterRestrictedPackages.includes(packageName);

  if (isRestrictedToSameClusterES) {
    return [outputType.Elasticsearch];
  }

  return Object.values(outputType);
}

export function outputYmlIncludesReservedPerformanceKey(
  configYml: string,
  // Dependency injection for `safeLoad` prevents bundle size issues 🤷‍♀️
  safeLoad: (yml: string) => any
) {
  if (!configYml || configYml === '') {
    return false;
  }

  const parsedYml = safeLoad(configYml);

  if (!isObject(parsedYml)) {
    if (typeof parsedYml === 'string') {
      return RESERVED_CONFIG_YML_KEYS.some((key) => parsedYml.includes(key));
    }
    return false;
  }

  const flattenedYml = isObject(parsedYml) ? getFlattenedObject(parsedYml) : {};

  return RESERVED_CONFIG_YML_KEYS.some((key) => Object.keys(flattenedYml).includes(key));
}

export function getDefaultPresetForEsOutput(
  configYaml: string,
  safeLoad: (yml: string) => any
): 'balanced' | 'custom' {
  if (outputYmlIncludesReservedPerformanceKey(configYaml, safeLoad)) {
    return 'custom';
  }

  return 'balanced';
}

export function outputTypeSupportPresets(type: ValueOf<OutputType>) {
  return OUTPUT_TYPES_WITH_PRESET_SUPPORT.includes(type);
}
