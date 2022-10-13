/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The files plugin ID
 */
export const PLUGIN_ID = 'files' as const;
/**
 * The files plugin name
 */
export const PLUGIN_NAME = 'files' as const;

/**
 * Unique type name of the file saved object
 */
export const FILE_SO_TYPE = 'file';
/**
 * Unique type name of the public file saved object
 */
export const FILE_SHARE_SO_TYPE = 'fileShare';

/**
 * The name of the fixed size ES-backed blob store
 */
export const ES_FIXED_SIZE_INDEX_BLOB_STORE = 'esFixedSizeIndex' as const;

export const FILES_MANAGE_PRIVILEGE = 'files:manageFiles' as const;
