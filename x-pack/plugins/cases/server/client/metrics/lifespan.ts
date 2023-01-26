/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type {
  CaseUserActionInjectedAttributesWithoutActionId,
  SingleCaseMetricsResponse,
  StatusInfo,
  StatusUserAction,
  UserActionWithResponse,
} from '../../../common/api';
import { CaseStatuses, StatusUserActionRt } from '../../../common/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { SingleCaseBaseHandler } from './single_case_base_handler';
import type { SingleCaseBaseHandlerCommonOptions } from './types';

export class Lifespan extends SingleCaseBaseHandler {
  constructor(options: SingleCaseBaseHandlerCommonOptions) {
    super(options, ['lifespan']);
  }

  public async compute(): Promise<SingleCaseMetricsResponse> {
    const {
      authorization,
      services: { userActionService },
      logger,
    } = this.options.clientArgs;

    const { casesClient } = this.options;

    try {
      const caseInfo = await casesClient.cases.get({ id: this.caseId });

      const caseOpenTimestamp = new Date(caseInfo.created_at);
      if (!isDateValid(caseOpenTimestamp)) {
        throw new Error(
          `The case created_at value is not a valid timestamp: ${caseInfo.created_at}`
        );
      }

      const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
        Operations.getUserActionMetrics
      );

      const statusUserActions = await userActionService.finder.findStatusChanges({
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

function isDateValid(date: Date): boolean {
  return date.toString() !== 'Invalid Date' && !isNaN(date.getTime());
}

interface StatusCalculations {
  durations: Map<CaseStatuses, number>;
  reopenDates: string[];
  lastStatus: CaseStatuses;
  lastStatusChangeTimestamp: Date;
}

export function getStatusInfo(
  statusUserActions: Array<SavedObject<CaseUserActionInjectedAttributesWithoutActionId>>,
  caseOpenTimestamp: Date
): StatusInfo {
  const accStatusInfo = statusUserActions.reduce<StatusCalculations>(
    (acc, userAction) => {
      const newStatusChangeTimestamp = new Date(userAction.attributes.created_at);

      if (!isValidStatusChangeUserAction(userAction.attributes, newStatusChangeTimestamp)) {
        return acc;
      }

      const { durations, lastStatus, lastStatusChangeTimestamp, reopenDates } = acc;

      const attributes = userAction.attributes;
      const newStatus = attributes.payload.status;

      return {
        durations: updateStatusDuration({
          durations,
          status: lastStatus,
          additionalDuration: datesDiff(newStatusChangeTimestamp, lastStatusChangeTimestamp),
        }),
        lastStatus: newStatus,
        lastStatusChangeTimestamp: newStatusChangeTimestamp,
        reopenDates: isReopen(newStatus, lastStatus)
          ? [...reopenDates, newStatusChangeTimestamp.toISOString()]
          : reopenDates,
      };
    },
    {
      durations: new Map<CaseStatuses, number>([
        [CaseStatuses.open, 0],
        [CaseStatuses['in-progress'], 0],
      ]),
      reopenDates: [],
      lastStatus: CaseStatuses.open,
      lastStatusChangeTimestamp: caseOpenTimestamp,
    }
  );

  // add in the duration from the current time to the duration of the last known status of the case
  const accumulatedDurations = updateStatusDuration({
    durations: accStatusInfo.durations,
    status: accStatusInfo.lastStatus,
    additionalDuration: datesDiff(new Date(), accStatusInfo.lastStatusChangeTimestamp),
  });

  return {
    openDuration: accumulatedDurations.get(CaseStatuses.open) ?? 0,
    inProgressDuration: accumulatedDurations.get(CaseStatuses['in-progress']) ?? 0,
    reopenDates: accStatusInfo.reopenDates,
  };
}

function isValidStatusChangeUserAction(
  attributes: CaseUserActionInjectedAttributesWithoutActionId,
  newStatusChangeTimestamp: Date
): attributes is UserActionWithResponse<StatusUserAction> {
  return StatusUserActionRt.is(attributes) && isDateValid(newStatusChangeTimestamp);
}

function isReopen(newStatus: CaseStatuses, lastStatus: CaseStatuses): boolean {
  // if the new status is going from close to anything other than closed then we are reopening the issue
  return newStatus !== CaseStatuses.closed && lastStatus === CaseStatuses.closed;
}

function datesDiff(date1: Date, date2: Date): number {
  if (!isDateValid(date1) || !isDateValid(date2)) {
    throw new Error(`Supplied dates were invalid date1: ${date1} date2: ${date2}`);
  }

  return Math.abs(date1.getTime() - date2.getTime());
}

function updateStatusDuration({
  durations,
  status,
  additionalDuration,
}: {
  durations: Map<CaseStatuses, number>;
  status: CaseStatuses;
  additionalDuration: number;
}): Map<CaseStatuses, number> {
  const duration = durations.get(status);
  if (duration === undefined) {
    return durations;
  }

  const updatedDurations = new Map(durations.entries());
  updatedDurations.set(status, duration + additionalDuration);

  return updatedDurations;
}
