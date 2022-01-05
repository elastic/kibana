/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import moment from 'moment';
import {
  CaseMetricsResponse,
  CaseStatuses,
  CaseUserActionResponse,
  StatusInfo,
  StatusUserActionRt,
} from '../../../common/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { CasesClient } from '../client';
import { CasesClientArgs } from '../types';
import { MetricsHandler } from './types';

export class Lifespan implements MetricsHandler {
  constructor(
    private readonly caseId: string,
    private readonly casesClient: CasesClient,
    private readonly clientArgs: CasesClientArgs
  ) {}

  public getFeatures(): Set<string> {
    return new Set(['lifespan']);
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { unsecuredSavedObjectsClient, authorization, userActionService, logger } =
      this.clientArgs;

    try {
      const caseInfo = await this.casesClient.cases.get({ id: this.caseId });

      const caseOpenTimestamp = moment(caseInfo.created_at);
      if (!caseOpenTimestamp.isValid()) {
        throw new Error(
          `The case created_at value is not a valid timestamp: ${caseInfo.created_at}`
        );
      }

      const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
        Operations.getUserActionMetrics
      );

      const statusUserActions = await userActionService.findStatusChanges({
        unsecuredSavedObjectsClient,
        caseId: this.caseId,
        filter: authorizationFilter,
      });

      const statusInfo = getStatusInfo(statusUserActions, caseOpenTimestamp);

      return {
        lifespan: {
          creationDate: caseInfo.created_at,
          closeDate: caseInfo.closed_at,
          statusInfo,
        },
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve lifespan metrics for case id: ${this.caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}

interface StatusCalculations {
  durations: Map<CaseStatuses, number>;
  numberOfReopens: number;
  lastStatus: CaseStatuses;
  lastStatusChangeTimestamp: moment.Moment;
}

export function getStatusInfo(
  statusUserActions: Array<SavedObject<CaseUserActionResponse>>,
  caseOpenTimestamp: moment.Moment
): StatusInfo {
  const accStatusInfo = statusUserActions.reduce<StatusCalculations>(
    (acc, userAction) => {
      const attributes = userAction.attributes;
      const newStatusChangeTimestamp = moment(attributes.created_at);

      if (!StatusUserActionRt.is(attributes) || !newStatusChangeTimestamp.isValid()) {
        return acc;
      }

      const { durations, lastStatus, lastStatusChangeTimestamp, numberOfReopens } = acc;

      const newStatus = attributes.payload.status;

      return {
        durations: updateDuration({
          durations,
          status: lastStatus,
          newStatusChangeTimestamp,
          lastStatusChangeTimestamp,
        }),
        lastStatus: newStatus,
        lastStatusChangeTimestamp: newStatusChangeTimestamp,
        numberOfReopens: isReopen(newStatus, lastStatus) ? numberOfReopens + 1 : numberOfReopens,
      };
    },
    {
      durations: new Map<CaseStatuses, number>([
        [CaseStatuses.open, 0],
        [CaseStatuses['in-progress'], 0],
      ]),
      numberOfReopens: 0,
      lastStatus: CaseStatuses.open,
      lastStatusChangeTimestamp: moment(caseOpenTimestamp),
    }
  );

  // add in the duration from the current time to the duration of the last known status of the case
  const accumulatedDurations = updateDuration({
    durations: accStatusInfo.durations,
    status: accStatusInfo.lastStatus,
    newStatusChangeTimestamp: moment(),
    lastStatusChangeTimestamp: accStatusInfo.lastStatusChangeTimestamp,
  });

  return {
    openDuration: accumulatedDurations.get(CaseStatuses.open) ?? 0,
    inProgressDuration: accumulatedDurations.get(CaseStatuses['in-progress']) ?? 0,
    numberOfReopens: accStatusInfo.numberOfReopens,
  };
}

function isReopen(newStatus: CaseStatuses, lastStatus: CaseStatuses): boolean {
  // if the new status is going from close to anything other than closed then we are reopening the issue
  return newStatus !== CaseStatuses.closed && lastStatus === CaseStatuses.closed;
}

function updateDuration({
  durations,
  status,
  newStatusChangeTimestamp,
  lastStatusChangeTimestamp,
}: {
  durations: Map<CaseStatuses, number>;
  status: CaseStatuses;
  newStatusChangeTimestamp: moment.Moment;
  lastStatusChangeTimestamp: moment.Moment;
}): Map<CaseStatuses, number> {
  const duration = durations.get(status);
  if (duration === undefined) {
    return durations;
  }

  const updatedDurations = new Map(durations.entries());
  updatedDurations.set(status, duration + newStatusChangeTimestamp.diff(lastStatusChangeTimestamp));

  return updatedDurations;
}
