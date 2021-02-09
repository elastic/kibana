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
    painlessExecuteAPI: getLinks.links.apis.painlessExecute,
    painlessExecuteAPIContexts: getLinks.links.apis.painlessExecuteAPIContexts,
    painlessAPIReference: getLinks.links.scriptedFields.painlessApi,
    painlessWalkthrough: getLinks.links.scriptedFields.painlessWalkthrough,
    painlessLangSpec: getLinks.links.scriptedFields.painlessLangSpec,
    esQueryDSL: getLinks.links.query.queryDsl,
    modulesScriptingPreferParams: getLinks.links.elasticsearch.scriptParameters,
  });
