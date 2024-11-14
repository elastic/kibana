/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getKibanaPrivilegesDocumentationUrl = (branch: string) => {
  // TODO: remove when docs support "main"
  const docBranch = branch === 'main' ? 'master' : branch;
  return `https://www.elastic.co/guide/en/kibana/${docBranch}/kibana-privileges.html`;
};
