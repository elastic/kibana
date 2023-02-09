/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity, CaseStatuses } from '../../common/api';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../common/constants';
import { ESCaseSeverity, ESCaseStatus } from '../services/cases/types';

/**
 * The name of the saved object reference indicating the action connector ID. This is stored in the Saved Object reference
 * field's name property.
 */
export const CONNECTOR_ID_REFERENCE_NAME = 'connectorId';

/**
 * The name of the saved object reference indicating the action connector ID that was used to push a case.
 */
export const PUSH_CONNECTOR_ID_REFERENCE_NAME = 'pushConnectorId';

/**
 * The name of the saved object reference indicating the caseId reference
 */
export const CASE_REF_NAME = `associated-${CASE_SAVED_OBJECT}`;

/**
 * The name of the saved object reference indicating the commentId reference
 */
export const COMMENT_REF_NAME = `associated-${CASE_COMMENT_SAVED_OBJECT}`;

/**
 * The name of the saved object reference indicating the externalReferenceId reference
 */
export const EXTERNAL_REFERENCE_REF_NAME = 'externalReferenceId';

/**
 * The name of the licensing feature to notify for feature usage with the licensing plugin
 */
export const LICENSING_CASE_ASSIGNMENT_FEATURE = 'Cases user assignment';

export const SEVERITY_EXTERNAL_TO_ESMODEL: Record<CaseSeverity, ESCaseSeverity> = {
  [CaseSeverity.LOW]: ESCaseSeverity.LOW,
  [CaseSeverity.MEDIUM]: ESCaseSeverity.MEDIUM,
  [CaseSeverity.HIGH]: ESCaseSeverity.HIGH,
  [CaseSeverity.CRITICAL]: ESCaseSeverity.CRITICAL,
};

export const SEVERITY_ESMODEL_TO_EXTERNAL: Record<ESCaseSeverity, CaseSeverity> = {
  [ESCaseSeverity.LOW]: CaseSeverity.LOW,
  [ESCaseSeverity.MEDIUM]: CaseSeverity.MEDIUM,
  [ESCaseSeverity.HIGH]: CaseSeverity.HIGH,
  [ESCaseSeverity.CRITICAL]: CaseSeverity.CRITICAL,
};

export const STATUS_EXTERNAL_TO_ESMODEL: Record<CaseStatuses, ESCaseStatus> = {
  [CaseStatuses.open]: ESCaseStatus.OPEN,
  [CaseStatuses['in-progress']]: ESCaseStatus.IN_PROGRESS,
  [CaseStatuses.closed]: ESCaseStatus.CLOSED,
};

export const STATUS_ESMODEL_TO_EXTERNAL: Record<ESCaseStatus, CaseStatuses> = {
  [ESCaseStatus.OPEN]: CaseStatuses.open,
  [ESCaseStatus.IN_PROGRESS]: CaseStatuses['in-progress'],
  [ESCaseStatus.CLOSED]: CaseStatuses.closed,
};
