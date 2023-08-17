/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PackagePolicy } from '../../../../../types';
import type {
  FleetServerAgentComponent,
  FleetServerAgentComponentStatus,
  FleetServerAgentComponentUnit,
} from '../../../../../../../../common/types/models/agent';
export class InputStatusFormatter {
  public status?: FleetServerAgentComponentStatus;
  public description?: string;
  public hasError?: boolean;

  constructor(status?: FleetServerAgentComponentStatus, message?: string) {
    this.status = status;
    this.description =
      message ||
      i18n.translate('xpack.fleet.agentDetailsIntegrations.inputStatusDefaultDescription', {
        defaultMessage: 'Not available',
      });
    this.hasError = status === 'FAILED' || status === 'DEGRADED';
  }

  getErrorTitleFromStatus(): string | undefined {
    switch (this.status) {
      case 'FAILED':
        return i18n.translate('xpack.fleet.agentDetailsIntegrations.inputErrorTitle.failed', {
          defaultMessage: 'Failed',
        });
      case 'DEGRADED':
        return i18n.translate('xpack.fleet.agentDetailsIntegrations.inputErrorTitle.degraded', {
          defaultMessage: 'Degraded',
        });
      default:
        return;
    }
  }
}

export const getInputUnitsByPackage = (
  agentComponents: FleetServerAgentComponent[],
  packagePolicy: PackagePolicy
): FleetServerAgentComponentUnit[] => {
  const re = new RegExp(packagePolicy.id);

  return agentComponents
    .map((c) => c?.units || [])
    .flat()
    .filter((u) => !!u && u.id.match(re));
};
