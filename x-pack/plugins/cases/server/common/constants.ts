/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../common/constants';

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
 * The name of the saved object reference indicating the action connector ID that was used for
 * adding a connector, or updating the existing connector for a user action's old_value field.
 */
export const USER_ACTION_OLD_ID_REF_NAME = 'oldConnectorId';

/**
 * The name of the saved object reference indicating the action connector ID that was used for pushing a case,
 * for a user action's old_value field.
 */
export const USER_ACTION_OLD_PUSH_ID_REF_NAME = 'oldPushConnectorId';

/**
 * The name of the saved object reference indicating the caseId reference
 */
export const CASE_REF_NAME = `associated-${CASE_SAVED_OBJECT}`;

/**
 * The name of the saved object reference indicating the commentId reference
 */
export const COMMENT_REF_NAME = `associated-${CASE_COMMENT_SAVED_OBJECT}`;

/**
 * The name of the saved object reference indicating the subCaseId reference
 */
export const SUB_CASE_REF_NAME = `associated-${SUB_CASE_SAVED_OBJECT}`;
