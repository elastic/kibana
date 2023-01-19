/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const VALID_SELECTOR_NAME_REGEX = /^[a-z0-9][a-z0-9_\-]+$/i; // alphanumberic (no - or _ allowed on first char)
export const MAX_SELECTOR_NAME_LENGTH = 128; // chars
export const MAX_CONDITION_VALUE_LENGTH_BYTES = 511;
export const MAX_FILE_PATH_VALUE_LENGTH_BYTES = 255;

// TODO: temporary until I change condition value length checks in the yaml editor view to be byte based.
export const MAX_CONDITION_VALUE_LENGTH = 64;
