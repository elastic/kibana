/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const runEndpointLoaderScript = () => {
  const {
    ELASTICSEARCH_USERNAME,
    ELASTICSEARCH_PASSWORD,
    hostname: HOSTNAME,
    configport: PORT,
  } = Cypress.env();
  const script = `node scripts/endpoint/resolver_generator.js --node="http://${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}@${HOSTNAME}:9220" --kibana="http://${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}@${HOSTNAME}:${PORT}" --delete --numHosts=1 --numDocs=1 --fleet --withNewUser=santaEndpoint:changeme --anc=1 --gen=1 --ch=1 --related=1 --relAlerts=1`;

  cy.exec(script, { env: { NODE_TLS_REJECT_UNAUTHORIZED: 1 } });
};
