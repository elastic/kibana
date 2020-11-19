/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { platformService } from '../services';

export const getDocumentationLinks = () => ({
  canvas: `${platformService
    .getService()
    .getElasticWebsiteUrl()}guide/en/kibana/${platformService
    .getService()
    .getDocLinkVersion()}/canvas.html`,
  numeral: `${platformService
    .getService()
    .getElasticWebsiteUrl()}guide/en/kibana/${platformService
    .getService()
    .getDocLinkVersion()}/guide/numeral.html`,
});
