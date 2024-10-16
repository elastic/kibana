/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup, AuthenticatedUser, Logger } from '@kbn/core/server';
import {
  ApiConfig,
  AttackDiscovery,
  AttackDiscoveryResponse,
  AttackDiscoveryStat,
  AttackDiscoveryStatus,
  GenerationInterval,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { Document } from '@langchain/core/documents';
import { v4 as uuidv4 } from 'uuid';
import { Moment } from 'moment';
import { transformError } from '@kbn/securitysolution-es-utils';
import moment from 'moment/moment';
import { uniq } from 'lodash/fp';

import {
  ATTACK_DISCOVERY_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
} from '../../../lib/telemetry/event_based_telemetry';
import { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';

export const REQUIRED_FOR_ATTACK_DISCOVERY: AnonymizationFieldResponse[] = [
  {
    id: uuidv4(),
    field: '_id',
    allowed: true,
    anonymized: true,
  },
  {
    id: uuidv4(),
    field: 'kibana.alert.original_time',
    allowed: true,
    anonymized: false,
  },
];

export const attackDiscoveryStatus: { [k: string]: AttackDiscoveryStatus } = {
  canceled: 'canceled',
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};
const MAX_GENERATION_INTERVALS = 5;

export const addGenerationInterval = (
  generationIntervals: GenerationInterval[],
  generationInterval: GenerationInterval
): GenerationInterval[] => {
  const newGenerationIntervals = [generationInterval, ...generationIntervals];

  if (newGenerationIntervals.length > MAX_GENERATION_INTERVALS) {
    return newGenerationIntervals.slice(0, MAX_GENERATION_INTERVALS); // Return the first MAX_GENERATION_INTERVALS items
  }

  return newGenerationIntervals;
};

export const updateAttackDiscoveryStatusToRunning = async (
  dataClient: AttackDiscoveryDataClient,
  authenticatedUser: AuthenticatedUser,
  apiConfig: ApiConfig,
  alertsContextCount: number
): Promise<{
  currentAd: AttackDiscoveryResponse;
  attackDiscoveryId: string;
}> => {
  const foundAttackDiscovery = await dataClient?.findAttackDiscoveryByConnectorId({
    connectorId: apiConfig.connectorId,
    authenticatedUser,
  });
  const currentAd = foundAttackDiscovery
    ? await dataClient?.updateAttackDiscovery({
        attackDiscoveryUpdateProps: {
          alertsContextCount,
          backingIndex: foundAttackDiscovery.backingIndex,
          id: foundAttackDiscovery.id,
          status: attackDiscoveryStatus.running,
        },
        authenticatedUser,
      })
    : await dataClient?.createAttackDiscovery({
        attackDiscoveryCreate: {
          alertsContextCount,
          apiConfig,
          attackDiscoveries: [],
          status: attackDiscoveryStatus.running,
        },
        authenticatedUser,
      });

  if (!currentAd) {
    throw new Error(
      `Could not ${foundAttackDiscovery ? 'update' : 'create'} attack discovery for connectorId: ${
        apiConfig.connectorId
      }`
    );
  }

  return {
    attackDiscoveryId: currentAd.id,
    currentAd,
  };
};

export const updateAttackDiscoveryStatusToCanceled = async (
  dataClient: AttackDiscoveryDataClient,
  authenticatedUser: AuthenticatedUser,
  connectorId: string
): Promise<AttackDiscoveryResponse> => {
  const foundAttackDiscovery = await dataClient?.findAttackDiscoveryByConnectorId({
    connectorId,
    authenticatedUser,
  });
  if (foundAttackDiscovery == null) {
    throw new Error(`Could not find attack discovery for connector id: ${connectorId}`);
  }
  if (foundAttackDiscovery.status !== 'running') {
    throw new Error(
      `Connector id ${connectorId} does not have a running attack discovery, and therefore cannot be canceled.`
    );
  }
  const updatedAttackDiscovery = await dataClient?.updateAttackDiscovery({
    attackDiscoveryUpdateProps: {
      backingIndex: foundAttackDiscovery.backingIndex,
      id: foundAttackDiscovery.id,
      status: attackDiscoveryStatus.canceled,
    },
    authenticatedUser,
  });

  if (!updatedAttackDiscovery) {
    throw new Error(`Could not update attack discovery for connector id: ${connectorId}`);
  }

  return updatedAttackDiscovery;
};

export const updateAttackDiscoveries = async ({
  anonymizedAlerts,
  apiConfig,
  attackDiscoveries,
  attackDiscoveryId,
  authenticatedUser,
  dataClient,
  latestReplacements,
  logger,
  size,
  startTime,
  telemetry,
}: {
  anonymizedAlerts: Document[];
  apiConfig: ApiConfig;
  attackDiscoveries: AttackDiscovery[] | null;
  attackDiscoveryId: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: AttackDiscoveryDataClient;
  latestReplacements: Replacements;
  logger: Logger;
  size: number;
  startTime: Moment;
  telemetry: AnalyticsServiceSetup;
}) => {
  try {
    const currentAd = await dataClient.getAttackDiscovery({
      id: attackDiscoveryId,
      authenticatedUser,
    });
    if (currentAd === null || currentAd?.status === 'canceled') {
      return;
    }
    const endTime = moment();
    const durationMs = endTime.diff(startTime);
    const alertsContextCount = anonymizedAlerts.length;
    const updateProps = {
      alertsContextCount,
      attackDiscoveries: attackDiscoveries ?? undefined,
      status: attackDiscoveryStatus.succeeded,
      ...(alertsContextCount === 0
        ? {}
        : {
            generationIntervals: addGenerationInterval(currentAd.generationIntervals, {
              durationMs,
              date: new Date().toISOString(),
            }),
          }),
      id: attackDiscoveryId,
      replacements: latestReplacements,
      backingIndex: currentAd.backingIndex,
    };

    await dataClient.updateAttackDiscovery({
      attackDiscoveryUpdateProps: updateProps,
      authenticatedUser,
    });
    telemetry.reportEvent(ATTACK_DISCOVERY_SUCCESS_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      alertsContextCount: updateProps.alertsContextCount,
      alertsCount:
        uniq(
          updateProps.attackDiscoveries?.flatMap(
            (attackDiscovery: AttackDiscovery) => attackDiscovery.alertIds
          )
        ).length ?? 0,
      configuredAlertsCount: size,
      discoveriesGenerated: updateProps.attackDiscoveries?.length ?? 0,
      durationMs,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  } catch (updateErr) {
    logger.error(updateErr);
    const updateError = transformError(updateErr);
    telemetry.reportEvent(ATTACK_DISCOVERY_ERROR_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      errorMessage: updateError.message,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  }
};

export const updateAttackDiscoveryLastViewedAt = async ({
  connectorId,
  authenticatedUser,
  dataClient,
}: {
  connectorId: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: AttackDiscoveryDataClient;
}): Promise<AttackDiscoveryResponse | null> => {
  const attackDiscovery = await dataClient.findAttackDiscoveryByConnectorId({
    connectorId,
    authenticatedUser,
  });

  if (attackDiscovery == null) {
    return null;
  }

  // update lastViewedAt time as this is the function used for polling by connectorId
  return dataClient.updateAttackDiscovery({
    attackDiscoveryUpdateProps: {
      id: attackDiscovery.id,
      lastViewedAt: new Date().toISOString(),
      backingIndex: attackDiscovery.backingIndex,
    },
    authenticatedUser,
  });
};

export const getAttackDiscoveryStats = async ({
  authenticatedUser,
  dataClient,
}: {
  authenticatedUser: AuthenticatedUser;
  dataClient: AttackDiscoveryDataClient;
}): Promise<AttackDiscoveryStat[]> => {
  const attackDiscoveries = await dataClient.findAllAttackDiscoveries({
    authenticatedUser,
  });

  return attackDiscoveries.map((ad) => {
    const updatedAt = moment(ad.updatedAt);
    const lastViewedAt = moment(ad.lastViewedAt);
    const timeSinceLastViewed = updatedAt.diff(lastViewedAt);
    const hasViewed = timeSinceLastViewed <= 0;
    const discoveryCount = ad.attackDiscoveries.length;
    return {
      hasViewed,
      status: ad.status,
      count: discoveryCount,
      connectorId: ad.apiConfig.connectorId,
    };
  });
};
