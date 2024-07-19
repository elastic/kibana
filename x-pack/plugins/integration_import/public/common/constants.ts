/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum Page {
  landing = 'landing',
  upload = 'upload',
  autoImport = 'autoImport',
}

export const PagePath = {
  [Page.landing]: '/import',
  [Page.upload]: '/import/upload',
  [Page.autoImport]: '/import/automatic',
};
