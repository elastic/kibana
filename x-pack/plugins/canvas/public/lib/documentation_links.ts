/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { platformService } from '../services';

export const getDocumentationLinks = () => ({
  canvas: `${platformService.getService().coreStart.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${
    platformService.getService().coreStart.docLinks.DOC_LINK_VERSION
  }/canvas.html`,
  numeral: `${platformService.getService().coreStart.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${
    platformService.getService().coreStart.docLinks.DOC_LINK_VERSION
  }/guide/numeral.html`,
});
