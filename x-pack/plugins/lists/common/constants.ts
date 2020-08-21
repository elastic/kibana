/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Value list routes
 */
export const LIST_URL = '/api/lists';
export const LIST_INDEX = `${LIST_URL}/index`;
export const LIST_ITEM_URL = `${LIST_URL}/items`;
export const LIST_PRIVILEGES_URL = `${LIST_URL}/privileges`;

/**
 * Exception list routes
 */
export const EXCEPTION_LIST_URL = '/api/exception_lists';
export const EXCEPTION_LIST_ITEM_URL = '/api/exception_lists/items';

/**
 * Exception list spaces
 */
export const EXCEPTION_LIST_NAMESPACE_AGNOSTIC = 'exception-list-agnostic';
export const EXCEPTION_LIST_NAMESPACE = 'exception-list';

/**
 * Specific routes for the single global space agnostic endpoint list
 */
export const ENDPOINT_LIST_URL = '/api/endpoint_list';

/**
 * Specific routes for the single global space agnostic endpoint list. These are convenience
 * routes where they are going to try and create the global space agnostic endpoint list if it
 * does not exist yet or if it was deleted at some point and re-create it before adding items to
 * the list
 */
export const ENDPOINT_LIST_ITEM_URL = '/api/endpoint_list/items';

/**
 * This ID is used for _both_ the Saved Object ID and for the list_id
 * for the single global space agnostic endpoint list
 */
export const ENDPOINT_LIST_ID = 'endpoint_list';

/** The name of the single global space agnostic endpoint list */
export const ENDPOINT_LIST_NAME = 'Elastic Endpoint Security Exception List';

/** The description of the single global space agnostic endpoint list */
export const ENDPOINT_LIST_DESCRIPTION = 'Elastic Endpoint Security Exception List';

export const MAX_EXCEPTION_LIST_SIZE = 10000;

/** ID of trusted apps agnostic list */
export const ENDPOINT_TRUSTED_APPS_LIST_ID = 'endpoint_trusted_apps';

/** Name of trusted apps agnostic list */
export const ENDPOINT_TRUSTED_APPS_LIST_NAME = 'Elastic Endpoint Security Trusted Apps List';

/** Description of trusted apps agnostic list */
export const ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION = 'Elastic Endpoint Security Trusted Apps List';
