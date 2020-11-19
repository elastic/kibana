/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'src/core/public';

export type Links = ReturnType<typeof getLinks>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getLinks = ({ DOC_LINK_VERSION, ELASTIC_WEBSITE_URL }: DocLinksStart) =>
  Object.freeze({
    painlessExecuteAPI: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-execute-api.html`,
    painlessExecuteAPIContexts: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-execute-api.html#_contexts`,
    painlessAPIReference: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-api-reference.html`,
    painlessWalkthrough: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-walkthrough.html`,
    painlessLangSpec: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-lang-spec.html`,
    esQueryDSL: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/query-dsl.html`,
    modulesScriptingPreferParams: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/modules-scripting-using.html#prefer-params`,
  });
