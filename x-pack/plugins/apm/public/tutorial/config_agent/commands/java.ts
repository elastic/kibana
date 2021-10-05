/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const java = `java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\
-Delastic.apm.service_name=my-application \\
-Delastic.apm.server_urls={{{apmServerUrl}}} \\
-Delastic.apm.secret_token={{{secretToken}}} \\
-Delastic.apm.environment=production \\
-Delastic.apm.application_packages=org.example \\
-jar my-application.jar`;
