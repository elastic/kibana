/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

// TODO make sure document links are right
export const documentationLinks = {
  code: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code.html`,
  codeIntelligence: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code.html`,
  gitFormat: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code.html`,
  codeInstallLangServer: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code-install-lang-server.html`,
  codeGettingStarted: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code-import-first-repo.html`,
  codeRepoManagement: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code-repo-management.html`,
  codeSearch: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code-search.html`,
  codeOtherFeatures: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code-basic-nav.html`,
  semanticNavigation: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/code-semantic-nav.html`,
  kibanaRoleManagement: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kibana-role-management.html`,
};
