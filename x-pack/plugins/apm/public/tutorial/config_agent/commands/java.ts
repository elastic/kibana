/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const javaVariables = {
  apmServiceName: 'Delastic.apm.service_name',
  secretToken: 'Delastic.apm.secret_token',
  apmServerUrl: 'Delastic.apm.server_url',
  apmEnvironment: 'Delastic.apm.environment',
};

export const java = `java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\
-${javaVariables.apmServiceName}={{{apmServiceName}}} \\
-${javaVariables.secretToken}={{{secretToken}}} \\
-${javaVariables.apmServerUrl}={{{apmServerUrl}}} \\
-${javaVariables.apmEnvironment}={{{apmEnvironment}}} \\
-Delastic.apm.application_packages=org.example \\
-jar {{{apmServiceName}}}.jar`;
