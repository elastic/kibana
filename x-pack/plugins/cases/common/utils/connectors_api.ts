/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Actions and connectors API endpoint helpers
 */

import { ACTION_URL, ACTION_TYPES_URL, CONNECTORS_URL } from '../../common/constants';

/**
 *
 * @returns {string} Connector types endpoint
 */
export const getAllConnectorTypesUrl = (): string => ACTION_TYPES_URL;

/**
 *
 * @param connectorId
 * @returns {string} Execute connector endpoint
 */
export const getExecuteConnectorUrl = (connectorId: string): string =>
  `${ACTION_URL}/connector/${connectorId}/_execute`;

/**
 *
 * @returns {string} Create connector endpoint
 */
export const getCreateConnectorUrl = (): string => `${ACTION_URL}/connector`;

/**
 *
 * @returns {string} All connectors endpoint
 */
export const getAllConnectorsUrl = (): string => CONNECTORS_URL;
