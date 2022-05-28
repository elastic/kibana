/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { getPackageInfo, getInstallation } from '../epm/packages';
import { getDataStreamPrivileges } from '../package_policies_to_agent_permissions';
import {
  PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES,
  AGENT_POLICY_DEFAULT_MONITORING_DATASETS,
} from '../../constants';
import type { FullAgentPolicyOutputPermissions } from '../../../common';
import { FLEET_ELASTIC_AGENT_PACKAGE } from '../../../common';
import { dataTypes } from '../../../common';

function buildDefault(enabled: { logs: boolean; metrics: boolean }, namespace: string) {
  let names: string[] = [];
  if (enabled.logs) {
    names = names.concat(
      AGENT_POLICY_DEFAULT_MONITORING_DATASETS.map((dataset) => `logs-${dataset}-${namespace}`)
    );
  }
  if (enabled.metrics) {
    names = names.concat(
      AGENT_POLICY_DEFAULT_MONITORING_DATASETS.map((dataset) => `metrics-${dataset}-${namespace}`)
    );
  }

  if (names.length === 0) {
    return {
      _elastic_agent_monitoring: {
        indices: [],
      },
    };
  }

  return {
    _elastic_agent_monitoring: {
      indices: [
        {
          names,
          privileges: PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES,
        },
      ],
    },
  };
}

export async function getMonitoringPermissions(
  soClient: SavedObjectsClientContract,
  enabled: { logs: boolean; metrics: boolean },
  namespace: string
): Promise<FullAgentPolicyOutputPermissions> {
  const installation = await getInstallation({
    savedObjectsClient: soClient,
    pkgName: FLEET_ELASTIC_AGENT_PACKAGE,
  });

  if (!installation) {
    return buildDefault(enabled, namespace);
  }

  const pkg = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName: installation.name,
    pkgVersion: installation.version,
  });

  if (!pkg.data_streams || pkg.data_streams.length === 0) {
    return buildDefault(enabled, namespace);
  }

  return {
    _elastic_agent_monitoring: {
      indices: pkg.data_streams
        .map((ds) => {
          if (ds.type === dataTypes.Logs && !enabled.logs) {
            return;
          }
          if (ds.type === dataTypes.Metrics && !enabled.metrics) {
            return;
          }
          return getDataStreamPrivileges(ds, namespace);
        })
        .filter(
          (
            i
          ): i is {
            names: string[];
            privileges: string[];
          } => typeof i !== 'undefined'
        ),
    },
  };
}
