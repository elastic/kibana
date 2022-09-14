/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockData = [
  {
    group: [
      { field: 'log.logger.keyword', value: 'request' },
      { field: 'log.origin.file.name.keyword', value: 'middleware/log_middleware.go' },
      { field: 'http.request.method.keyword', value: 'POST' },
      { field: 'meta.cloud.machine_type.keyword', value: 'r4.4xlarge' },
      { field: 'docker.container.labels.description.keyword', value: 'Elastic APM Server' },
      { field: 'meta.cloud.availability_zone.keyword', value: 'eu-west-1c' },
      {
        field: 'docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword',
        value: 'instance-0000000009',
      },
      { field: 'url.original.keyword', value: '/intake/v2/rum/events' },
      { field: 'docker.container.labels.org.label-schema.version.keyword', value: '7.9.0' },
      { field: 'beat.name.keyword', value: 'i-021e32907877b6060' },
      {
        field: 'docker.container.id.keyword',
        value: 'cb7d242c6447e54c96da4333cc9b513baa0c2b20ee47f5',
      },
      { field: 'error.message', value: 'rate limit exceeded' },
      { field: 'message', value: 'too many requests' },
      {
        field: 'user_agent.original.keyword',
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Apple',
      },
    ],
    docCount: 26549,
  },
  {
    group: [
      { field: 'log.logger.keyword', value: 'publisher_pipeline_output' },
      { field: 'log.origin.file.name.keyword', value: 'pipeline/output.go' },
      { field: 'http.request.method.keyword', value: 'POST' },
      { field: 'meta.cloud.machine_type.keyword', value: 'r5d.8xlarge' },
      {
        field: 'docker.container.labels.description.keyword',
        value: 'Agent manages other beats based on configuration',
      },
      { field: 'meta.cloud.availability_zone.keyword', value: 'eu-west-1a' },
      {
        field: 'docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword',
        value: 'instance-0000000001',
      },
      { field: 'url.original.keyword', value: '/intake/v2/events' },
      { field: 'docker.container.labels.org.label-schema.version.keyword', value: '7.6.0' },
      { field: 'beat.name.keyword', value: 'i-0b687bc60a868903e' },
      {
        field: 'docker.container.id.keyword',
        value: 'd8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3',
      },
      { field: 'error.message', value: 'rate limit exceeded' },
      { field: 'message', value: 'too many requests' },
      { field: 'user_agent.original.keyword', value: 'elasticapm-python/5.8.1' },
    ],
    docCount: 20970,
  },
  {
    group: [
      { field: 'log.logger.keyword', value: 'request' },
      { field: 'log.origin.file.name.keyword', value: 'middleware/log_middleware.go' },
      { field: 'http.request.method.keyword', value: 'POST' },
      { field: 'meta.cloud.machine_type.keyword', value: 'r4.4xlarge' },
      {
        field: 'docker.container.labels.description.keyword',
        value: 'Agent manages other beats based on configuration',
      },
      { field: 'meta.cloud.availability_zone.keyword', value: 'eu-west-1a' },
      {
        field: 'docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword',
        value: 'instance-0000000001',
      },
      { field: 'url.original.keyword', value: '/intake/v2/events' },
      { field: 'docker.container.labels.org.label-schema.version.keyword', value: '7.6.0' },
      { field: 'beat.name.keyword', value: 'i-0b687bc60a868903e' },
      {
        field: 'docker.container.id.keyword',
        value: 'd8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3',
      },
      { field: 'error.message', value: 'rate limit exceeded' },
      { field: 'message', value: 'too many requests' },
      { field: 'user_agent.original.keyword', value: 'elasticapm-python/5.8.1' },
    ],
    docCount: 19153,
  },
  {
    group: [
      { field: 'log.logger.keyword', value: 'request' },
      { field: 'log.origin.file.name.keyword', value: 'middleware/log_middleware.go' },
      { field: 'http.request.method.keyword', value: 'POST' },
      { field: 'meta.cloud.machine_type.keyword', value: 'r5d.8xlarge' },
      {
        field: 'docker.container.labels.description.keyword',
        value: 'Agent manages other beats based on configuration',
      },
      { field: 'meta.cloud.availability_zone.keyword', value: 'eu-west-1a' },
      {
        field: 'docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword',
        value: 'instance-0000000001',
      },
      { field: 'url.original.keyword', value: '/intake/v2/events' },
      { field: 'docker.container.labels.org.label-schema.version.keyword', value: '7.6.0' },
      { field: 'beat.name.keyword', value: 'i-0b687bc60a868903e' },
      {
        field: 'docker.container.id.keyword',
        value: 'd8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3',
      },
      { field: 'error.message', value: 'rate limit exceeded' },
      { field: 'message', value: 'too many requests' },
      { field: 'user_agent.original.keyword', value: 'elasticapm-python/5.8.1' },
    ],
    docCount: 18222,
  },
  {
    group: [
      { field: 'log.logger.keyword', value: 'request' },
      { field: 'log.origin.file.name.keyword', value: 'middleware/log_middleware.go' },
      { field: 'http.request.method.keyword', value: 'POST' },
      { field: 'meta.cloud.machine_type.keyword', value: 'r4.4xlarge' },
      { field: 'docker.container.labels.description.keyword', value: 'Elastic APM Server' },
      { field: 'meta.cloud.availability_zone.keyword', value: 'eu-west-1a' },
      {
        field: 'docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword',
        value: 'instance-0000000001',
      },
      { field: 'url.original.keyword', value: '/intake/v2/events' },
      { field: 'docker.container.labels.org.label-schema.version.keyword', value: '7.6.0' },
      { field: 'beat.name.keyword', value: 'i-0b687bc60a868903e' },
      {
        field: 'docker.container.id.keyword',
        value: 'd8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3',
      },
      { field: 'error.message', value: 'rate limit exceeded' },
      { field: 'message', value: 'too many requests' },
      { field: 'user_agent.original.keyword', value: 'elasticapm-python/5.8.1' },
    ],
    docCount: 17997,
  },
];
