/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOGSTASH_CONFIG_PIPELINES = `- pipeline.id: elastic-agent-pipeline
  path.config: "/etc/path/to/elastic-agent-pipeline.config"
`;

export function getLogstashPipeline(apiKey?: string) {
  return `input {
  elastic_agent {
    port => 5044
    ssl => true
    ssl_certificate_authorities => ["<ca_path>"]
    ssl_certificate => "<server_cert_path>"
    ssl_key => "<server_cert_key>"
    ssl_verify_mode => "force_peer"
  }
}

output {
  elasticsearch {
    hosts => "<es_host>"
    api_key => "<api_key>"
    data_stream => true
    # ca_cert: <path-to-cert-or-pem>
  }
}`.replace('<api_key>', apiKey || '<api_key>');
}
