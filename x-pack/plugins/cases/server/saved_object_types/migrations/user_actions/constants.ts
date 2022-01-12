/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
