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
