/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CLOUD = 'cloud';
export const CLOUD_AVAILABILITY_ZONE = 'cloud.availability_zone';
export const CLOUD_PROVIDER = 'cloud.provider';
export const CLOUD_REGION = 'cloud.region';
export const CLOUD_MACHINE_TYPE = 'cloud.machine.type';
export const CLOUD_ACCOUNT_ID = 'cloud.account.id';
export const CLOUD_INSTANCE_ID = 'cloud.instance.id';
export const CLOUD_INSTANCE_NAME = 'cloud.instance.name';
export const CLOUD_SERVICE_NAME = 'cloud.service.name';

export const SERVICE = 'service';
export const SERVICE_NAME = 'service.name';
export const SERVICE_ENVIRONMENT = 'service.environment';
export const SERVICE_FRAMEWORK_NAME = 'service.framework.name';
export const SERVICE_FRAMEWORK_VERSION = 'service.framework.version';
export const SERVICE_LANGUAGE_NAME = 'service.language.name';
export const SERVICE_LANGUAGE_VERSION = 'service.language.version';
export const SERVICE_RUNTIME_NAME = 'service.runtime.name';
export const SERVICE_RUNTIME_VERSION = 'service.runtime.version';
export const SERVICE_NODE_NAME = 'service.node.name';
export const SERVICE_VERSION = 'service.version';

export const AGENT = 'agent';
export const AGENT_NAME = 'agent.name';
export const AGENT_VERSION = 'agent.version';

export const URL_FULL = 'url.full';
export const HTTP_REQUEST_METHOD = 'http.request.method';
export const HTTP_RESPONSE_STATUS_CODE = 'http.response.status_code';
export const USER_ID = 'user.id';
export const USER_AGENT_ORIGINAL = 'user_agent.original';
export const USER_AGENT_NAME = 'user_agent.name';

export const DESTINATION_ADDRESS = 'destination.address';

export const OBSERVER_HOSTNAME = 'observer.hostname';
export const OBSERVER_LISTENING = 'observer.listening';
export const PROCESSOR_EVENT = 'processor.event';

export const TRANSACTION_DURATION = 'transaction.duration.us';
export const TRANSACTION_DURATION_HISTOGRAM = 'transaction.duration.histogram';
export const TRANSACTION_DURATION_SUMMARY = 'transaction.duration.summary';
export const TRANSACTION_TYPE = 'transaction.type';
export const TRANSACTION_RESULT = 'transaction.result';
export const TRANSACTION_NAME = 'transaction.name';
export const TRANSACTION_ID = 'transaction.id';
export const TRANSACTION_SAMPLED = 'transaction.sampled';
export const TRANSACTION_PAGE_URL = 'transaction.page.url';
export const TRANSACTION_FAILURE_COUNT = 'transaction.failure_count';
export const TRANSACTION_SUCCESS_COUNT = 'transaction.success_count';
// for transaction metrics
export const TRANSACTION_ROOT = 'transaction.root';

export const EVENT_OUTCOME = 'event.outcome';

export const TRACE_ID = 'trace.id';

export const SPAN_DURATION = 'span.duration.us';
export const SPAN_TYPE = 'span.type';
export const SPAN_SUBTYPE = 'span.subtype';
export const SPAN_SELF_TIME_SUM = 'span.self_time.sum.us';
export const SPAN_ACTION = 'span.action';
export const SPAN_NAME = 'span.name';
export const SPAN_ID = 'span.id';
export const SPAN_DESTINATION_SERVICE_RESOURCE =
  'span.destination.service.resource';
export const SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT =
  'span.destination.service.response_time.count';

export const SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM =
  'span.destination.service.response_time.sum.us';

export const SPAN_LINKS = 'span.links';
export const SPAN_LINKS_TRACE_ID = 'span.links.trace.id';
export const SPAN_LINKS_SPAN_ID = 'span.links.span.id';

// Parent ID for a transaction or span
export const PARENT_ID = 'parent.id';

export const ERROR_ID = 'error.id';
export const ERROR_GROUP_ID = 'error.grouping_key';
export const ERROR_CULPRIT = 'error.culprit';
export const ERROR_LOG_LEVEL = 'error.log.level';
export const ERROR_LOG_MESSAGE = 'error.log.message';
export const ERROR_EXC_MESSAGE = 'error.exception.message'; // only to be used in es queries, since error.exception is now an array
export const ERROR_EXC_HANDLED = 'error.exception.handled'; // only to be used in es queries, since error.exception is now an array
export const ERROR_EXC_TYPE = 'error.exception.type';
export const ERROR_PAGE_URL = 'error.page.url';

// METRICS
export const METRIC_SYSTEM_FREE_MEMORY = 'system.memory.actual.free';
export const METRIC_SYSTEM_TOTAL_MEMORY = 'system.memory.total';
export const METRIC_SYSTEM_CPU_PERCENT = 'system.cpu.total.norm.pct';
export const METRIC_PROCESS_CPU_PERCENT = 'system.process.cpu.total.norm.pct';
export const METRIC_CGROUP_MEMORY_LIMIT_BYTES =
  'system.process.cgroup.memory.mem.limit.bytes';
export const METRIC_CGROUP_MEMORY_USAGE_BYTES =
  'system.process.cgroup.memory.mem.usage.bytes';

export const METRIC_JAVA_HEAP_MEMORY_MAX = 'jvm.memory.heap.max';
export const METRIC_JAVA_HEAP_MEMORY_COMMITTED = 'jvm.memory.heap.committed';
export const METRIC_JAVA_HEAP_MEMORY_USED = 'jvm.memory.heap.used';
export const METRIC_JAVA_NON_HEAP_MEMORY_MAX = 'jvm.memory.non_heap.max';
export const METRIC_JAVA_NON_HEAP_MEMORY_COMMITTED =
  'jvm.memory.non_heap.committed';
export const METRIC_JAVA_NON_HEAP_MEMORY_USED = 'jvm.memory.non_heap.used';
export const METRIC_JAVA_THREAD_COUNT = 'jvm.thread.count';
export const METRIC_JAVA_GC_COUNT = 'jvm.gc.count';
export const METRIC_JAVA_GC_TIME = 'jvm.gc.time';

export const METRICSET_NAME = 'metricset.name';

export const LABEL_NAME = 'labels.name';

export const HOST = 'host';
export const HOST_HOSTNAME = 'host.hostname'; // Do not use. Please use `HOST_NAME` instead.
export const HOST_NAME = 'host.name';
export const HOST_OS_PLATFORM = 'host.os.platform';
export const CONTAINER_ID = 'container.id';
export const CONTAINER = 'container';
export const CONTAINER_IMAGE = 'container.image.name';

// Kubernetes
export const KUBERNETES = 'kubernetes';
export const KUBERNETES_CONTAINER_NAME = 'kubernetes.container.name';
export const KUBERNETES_DEPLOYMENT = 'kubernetes.deployment';
export const KUBERNETES_DEPLOYMENT_NAME = 'kubernetes.deployment.name';
export const KUBERNETES_NAMESPACE_NAME = 'kubernetes.namespace.name';
export const KUBERNETES_NAMESPACE = 'kubernetes.namespace';
export const KUBERNETES_POD_NAME = 'kubernetes.pod.name';
export const KUBERNETES_POD_UID = 'kubernetes.pod.uid';
export const KUBERNETES_REPLICASET = 'kubernetes.replicaset';
export const KUBERNETES_REPLICASET_NAME = 'kubernetes.replicaset.name';

export const CLIENT_GEO_COUNTRY_ISO_CODE = 'client.geo.country_iso_code';

// RUM Labels
export const TRANSACTION_URL = 'url.full';
export const USER_AGENT_DEVICE = 'user_agent.device.name';
export const USER_AGENT_OS = 'user_agent.os.name';

export const FAAS_ID = 'faas.id';
export const FAAS_COLDSTART = 'faas.coldstart';
export const FAAS_TRIGGER_TYPE = 'faas.trigger.type';
export const FAAS_DURATION = 'faas.duration';
export const FAAS_COLDSTART_DURATION = 'faas.coldstart_duration';
export const FAAS_BILLED_DURATION = 'faas.billed_duration';

// Metadata
export const TIER = '_tier';
export const INDEX = '_index';
