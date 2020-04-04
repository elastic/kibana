/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Up until the end of the 8.x release cycle we need to support both
 * V1 and V2 index template formats. This constant keeps track of whether
 * we create V1 or V2 index template format in the UI.
 */
export const DEFAULT_INDEX_TEMPLATE_VERSION_FORMAT = 1;
