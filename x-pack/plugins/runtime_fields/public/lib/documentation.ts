/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'src/core/public';

export const getLinks = (docLinks: DocLinksStart) => {
  return {
    runtimePainless: docLinks.links.runtimeFields.mapping,
    painlessSyntax: docLinks.links.scriptedFields.painlessLangSpec,
  };
};
