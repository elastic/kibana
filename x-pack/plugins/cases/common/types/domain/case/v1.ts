/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import { ExternalServiceRt } from '../external_service/v1';
import { CaseAssigneesRt, UserRt } from '../user/v1';
import { CaseConnectorRt } from '../connector/v1';
import { AttachmentRt } from '../attachment/v1';
import { CaseCustomFieldsRt } from '../custom_field/v1';

export { CaseStatuses };

/**
 * Status
 */
export const CaseStatusRt = rt.union([
  rt.literal(CaseStatuses.open),
  rt.literal(CaseStatuses['in-progress']),
  rt.literal(CaseStatuses.closed),
]);

export const caseStatuses = Object.values(CaseStatuses);

/**
 * Severity
 */

export enum CaseSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const CaseSeverityRt = rt.union([
  rt.literal(CaseSeverity.LOW),
  rt.literal(CaseSeverity.MEDIUM),
  rt.literal(CaseSeverity.HIGH),
  rt.literal(CaseSeverity.CRITICAL),
]);

/**
 * Case
 */

export const CaseSettingsRt = rt.strict({
  syncAlerts: rt.boolean,
});

const CaseBaseFields = {
  /**
   * The description of the case
   */
  description: rt.string,
  /**
   * The identifying strings for filter a case
   */
  tags: rt.array(rt.string),
  /**
   * The title of a case
   */
  title: rt.string,
  /**
   * The external system that the case can be synced with
   */
  connector: CaseConnectorRt,
  /**
   * The severity of the case
   */
  severity: CaseSeverityRt,
  /**
   * The users assigned to this case
   */
  assignees: CaseAssigneesRt,
  /**
   * The category of the case.
   */
  category: rt.union([rt.string, rt.null]),
  /**
   * An array containing the possible,
   * user-configured custom fields.
   */
  customFields: CaseCustomFieldsRt,
  /**
   * The alert sync settings
   */
  settings: CaseSettingsRt,
};

export const CaseBaseOptionalFieldsRt = rt.exact(
  rt.partial({
    ...CaseBaseFields,
  })
);

const CaseBasicRt = rt.strict({
  /**
   * The current status of the case (open, closed, in-progress)
   */
  status: CaseStatusRt,
  /**
   * The plugin owner of the case
   */
  owner: rt.string,
  ...CaseBaseFields,
});

export const CaseAttributesRt = rt.intersection([
  CaseBasicRt,
  rt.strict({
    duration: rt.union([rt.number, rt.null]),
    closed_at: rt.union([rt.string, rt.null]),
    closed_by: rt.union([UserRt, rt.null]),
    created_at: rt.string,
    created_by: UserRt,
    external_service: rt.union([ExternalServiceRt, rt.null]),
    updated_at: rt.union([rt.string, rt.null]),
    updated_by: rt.union([UserRt, rt.null]),
  }),
]);

export const CaseRt = rt.intersection([
  CaseAttributesRt,
  rt.strict({
    id: rt.string,
    totalComment: rt.number,
    totalAlerts: rt.number,
    version: rt.string,
  }),
  rt.exact(
    rt.partial({
      comments: rt.array(AttachmentRt),
    })
  ),
]);

export const CasesRt = rt.array(CaseRt);

export const AttachmentTotalsRt = rt.strict({
  alerts: rt.number,
  userComments: rt.number,
});

export const RelatedCaseRt = rt.strict({
  id: rt.string,
  title: rt.string,
  description: rt.string,
  status: CaseStatusRt,
  createdAt: rt.string,
  totals: AttachmentTotalsRt,
});

export type Case = rt.TypeOf<typeof CaseRt>;
export type Cases = rt.TypeOf<typeof CasesRt>;
export type CaseAttributes = rt.TypeOf<typeof CaseAttributesRt>;
export type CaseSettings = rt.TypeOf<typeof CaseSettingsRt>;
export type RelatedCase = rt.TypeOf<typeof RelatedCaseRt>;
export type AttachmentTotals = rt.TypeOf<typeof AttachmentTotalsRt>;
export type CaseBaseOptionalFields = rt.TypeOf<typeof CaseBaseOptionalFieldsRt>;
