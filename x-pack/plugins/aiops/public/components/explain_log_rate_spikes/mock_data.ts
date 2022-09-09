// TODO: go through each group, remove duplicate values and create table items like
// { id: 1, group: {...}, doc_count }
// create itemIdToExpandedRowMap using the id
// will need to go through changePoints and find matching fieldName and fieldValue to get the expanded row contents
// could make an object keeping track of the count for each value of each key 
// { log.logger.keyword: { request: 3, publisher_pipeline_output: 1 }, http.request.method.keyword: { POST: 1 } }

export const mockData = [{
  "log.logger.keyword": "request",
  "log.origin.file.name.keyword": "middleware/log_middleware.go",
  "http.request.method.keyword": "POST",
  "meta.cloud.machine_type.keyword": "r4.4xlarge",
  "docker.container.labels.description.keyword": "Elastic APM Server",
  "meta.cloud.availability_zone.keyword": "eu-west-1c",
  "docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword": "instance-0000000009",
  "url.original.keyword": "/intake/v2/rum/events",
  "docker.container.labels.org.label-schema.version.keyword": "7.9.0",
  "beat.name.keyword": "i-021e32907877b6060",
  "docker.container.id.keyword": "cb7d242c6447e54c96da4333cc9b513baa0c2b20ee47f5",
  "error.message": "rate limit exceeded",
  "message": "too many requests",
  "user_agent.original.keyword": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Apple",
  "doc_count": 26549
},
{
  "log.logger.keyword": "publisher_pipeline_output",
  "log.origin.file.name.keyword": "pipeline/output.go",
  "http.request.method.keyword": "POST",
  "meta.cloud.machine_type.keyword": "r5d.8xlarge",
  "docker.container.labels.description.keyword": "Agent manages other beats based on configuration",
  "meta.cloud.availability_zone.keyword": "eu-west-1a",
  "docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword": "instance-0000000001",
  "url.original.keyword": "/intake/v2/events",
  "docker.container.labels.org.label-schema.version.keyword": "7.6.0",
  "beat.name.keyword": "i-0b687bc60a868903e",
  "docker.container.id.keyword": "d8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3",
  "error.message": "rate limit exceeded",
  "message": "too many requests",
  "user_agent.original.keyword": "elasticapm-python/5.8.1",
  "doc_count": 20970
},
{
  "log.logger.keyword": "request",
  "log.origin.file.name.keyword": "middleware/log_middleware.go",
  "http.request.method.keyword": "POST",
  "meta.cloud.machine_type.keyword": "r4.4xlarge",
  "docker.container.labels.description.keyword": "Agent manages other beats based on configuration",
  "meta.cloud.availability_zone.keyword": "eu-west-1a",
  "docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword": "instance-0000000001",
  "url.original.keyword": "/intake/v2/events",
  "docker.container.labels.org.label-schema.version.keyword": "7.6.0",
  "beat.name.keyword": "i-0b687bc60a868903e",
  "docker.container.id.keyword": "d8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3",
  "error.message": "rate limit exceeded",
  "message": "too many requests",
  "user_agent.original.keyword": "elasticapm-python/5.8.1",
  "doc_count": 19153
},
{
  "log.logger.keyword": "request",
  "log.origin.file.name.keyword": "middleware/log_middleware.go",
  "http.request.method.keyword": "POST",
  "meta.cloud.machine_type.keyword": "r5d.8xlarge",
  "docker.container.labels.description.keyword": "Agent manages other beats based on configuration",
  "meta.cloud.availability_zone.keyword": "eu-west-1a",
  "docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword": "instance-0000000001",
  "url.original.keyword": "/intake/v2/events",
  "docker.container.labels.org.label-schema.version.keyword": "7.6.0",
  "beat.name.keyword": "i-0b687bc60a868903e",
  "docker.container.id.keyword": "d8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3",
  "error.message": "rate limit exceeded",
  "message": "too many requests",
  "user_agent.original.keyword": "elasticapm-python/5.8.1",
  "doc_count": 18222
},
{
  "log.logger.keyword": "request",
  "log.origin.file.name.keyword": "middleware/log_middleware.go",
  "http.request.method.keyword": "POST",
  "meta.cloud.machine_type.keyword": "r4.4xlarge",
  "docker.container.labels.description.keyword": "Elastic APM Server",
  "meta.cloud.availability_zone.keyword": "eu-west-1a",
  "docker.container.labels.co.elastic.cloud.allocator.instance_id.keyword": "instance-0000000001",
  "url.original.keyword": "/intake/v2/events",
  "docker.container.labels.org.label-schema.version.keyword": "7.6.0",
  "beat.name.keyword": "i-0b687bc60a868903e",
  "docker.container.id.keyword": "d8fd7ff10fda3e20583b0abcc2ff25916935407e87bce3",
  "error.message": "rate limit exceeded",
  "message": "too many requests",
  "user_agent.original.keyword": "elasticapm-python/5.8.1",
  "doc_count": 17997
}];