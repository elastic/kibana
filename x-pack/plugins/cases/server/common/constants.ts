/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity, CaseStatuses } from '../../common/api';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../common/constants';
import { CaseSeveritySavedObject, CaseStatusSavedObject } from './types/case';

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

export const SEVERITY_EXTERNAL_TO_ESMODEL: Record<CaseSeverity, CaseSeveritySavedObject> = {
  [CaseSeverity.LOW]: CaseSeveritySavedObject.LOW,
  [CaseSeverity.MEDIUM]: CaseSeveritySavedObject.MEDIUM,
  [CaseSeverity.HIGH]: CaseSeveritySavedObject.HIGH,
  [CaseSeverity.CRITICAL]: CaseSeveritySavedObject.CRITICAL,
};

export const SEVERITY_ESMODEL_TO_EXTERNAL: Record<CaseSeveritySavedObject, CaseSeverity> = {
  [CaseSeveritySavedObject.LOW]: CaseSeverity.LOW,
  [CaseSeveritySavedObject.MEDIUM]: CaseSeverity.MEDIUM,
  [CaseSeveritySavedObject.HIGH]: CaseSeverity.HIGH,
  [CaseSeveritySavedObject.CRITICAL]: CaseSeverity.CRITICAL,
};

export const STATUS_EXTERNAL_TO_ESMODEL: Record<CaseStatuses, CaseStatusSavedObject> = {
  [CaseStatuses.open]: CaseStatusSavedObject.OPEN,
  [CaseStatuses['in-progress']]: CaseStatusSavedObject.IN_PROGRESS,
  [CaseStatuses.closed]: CaseStatusSavedObject.CLOSED,
};

export const STATUS_ESMODEL_TO_EXTERNAL: Record<CaseStatusSavedObject, CaseStatuses> = {
  [CaseStatusSavedObject.OPEN]: CaseStatuses.open,
  [CaseStatusSavedObject.IN_PROGRESS]: CaseStatuses['in-progress'],
  [CaseStatusSavedObject.CLOSED]: CaseStatuses.closed,
};
