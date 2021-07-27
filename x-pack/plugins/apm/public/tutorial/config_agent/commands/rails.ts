/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const rails = `# config/elastic_apm.yml:

# Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
# Defaults to the name of your Rails app
service_name: 'my-service'

# Use if APM Server requires a secret token
secret_token: '{{{secretToken}}}'

# Set the custom APM Server URL (default: http://localhost:8200)
server_url: '{{{apmServerUrl}}}'

# Set the service environment
environment: 'production'`;
