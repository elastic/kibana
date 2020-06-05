/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Up until the end of the 8.x release cycle we need to support both
 * legacy and composable index template formats. This constant keeps track of whether
 * we create legacy index template format by default in the UI.
 */
export const CREATE_LEGACY_TEMPLATE_BY_DEFAULT = true;
