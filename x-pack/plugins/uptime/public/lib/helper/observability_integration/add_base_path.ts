/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const addBasePath = (basePath: string, url: string) =>
  `${basePath.length > 0 ? `/${basePath}` : ''}${url}`;
