/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from 'src/core/public';

export type Links = ReturnType<typeof getLinks>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getLinks = ({ DOC_LINK_VERSION, ELASTIC_WEBSITE_URL }: DocLinksStart) =>
  Object.freeze({
    painlessExecuteAPI: `${docLinks.links.apis.painlessExecute}`,
    painlessExecuteAPIContexts: `${docLinks.links.apis.painlessExecuteAPIContexts}`,
    painlessAPIReference: `${docLinks.links.scriptedFields.painlessApi}`,
    painlessWalkthrough: `${docLinks.links.scriptedFields.painlessWalkthrough}`,
    painlessLangSpec: `${docLinks.links.scriptedFields.painlessLangSpec}`,
    esQueryDSL: `${docLinks.links.query.queryDsl}`,
    modulesScriptingPreferParams: `${docLinks.links.elasticsearch.scriptParameters}`,
  });
