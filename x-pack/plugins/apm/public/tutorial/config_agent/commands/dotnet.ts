/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const dotnet = `{
"ElasticApm": {
"SecretToken": "{{{secretToken}}}",
"ServerUrls": "{{{apmServerUrl}}}", //Set custom APM Server URL (default: http://localhost:8200)
"ServiceName": "MyApp", //allowed characters: a-z, A-Z, 0-9, -, _, and space. Default is the entry assembly of the application
"Environment": "production", // Set the service environment
}
}`;
