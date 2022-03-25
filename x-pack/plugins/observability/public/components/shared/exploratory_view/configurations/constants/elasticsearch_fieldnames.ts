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
export const USER_AGENT_VERSION = 'user_agent.version';

export const DESTINATION_ADDRESS = 'destination.address';

export const OBSERVER_HOSTNAME = 'observer.hostname';
export const OBSERVER_VERSION_MAJOR = 'observer.version_major';
export const OBSERVER_LISTENING = 'observer.listening';
export const PROCESSOR_EVENT = 'processor.event';

export const TRANSACTION_DURATION = 'transaction.duration.us';
export const TRANSACTION_DURATION_HISTOGRAM = 'transaction.duration.histogram';
export const TRANSACTION_TYPE = 'transaction.type';
export const TRANSACTION_RESULT = 'transaction.result';
export const TRANSACTION_NAME = 'transaction.name';
export const TRANSACTION_ID = 'transaction.id';
export const TRANSACTION_SAMPLED = 'transaction.sampled';
export const TRANSACTION_PAGE_URL = 'transaction.page.url';
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
export const SPAN_DESTINATION_SERVICE_RESOURCE = 'span.destination.service.resource';
export const SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT =
  'span.destination.service.response_time.count';

export const SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM =
  'span.destination.service.response_time.sum.us';

// Parent ID for a transaction or span
export const PARENT_ID = 'parent.id';

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
export const METRIC_SYSTEM_MEMORY_USAGE = 'system.memory.usage';
export const METRIC_SYSTEM_CPU_USAGE = 'system.cpu.usage';
export const METRIC_SYSTEM_TOTAL_MEMORY = 'system.memory.total';
export const METRIC_SYSTEM_CPU_PERCENT = 'system.cpu.total.norm.pct';
export const METRIC_PROCESS_CPU_PERCENT = 'system.process.cpu.total.norm.pct';
export const METRIC_CGROUP_MEMORY_LIMIT_BYTES = 'system.process.cgroup.memory.mem.limit.bytes';
export const METRIC_CGROUP_MEMORY_USAGE_BYTES = 'system.process.cgroup.memory.mem.usage.bytes';

export const METRIC_JAVA_HEAP_MEMORY_MAX = 'jvm.memory.heap.max';
export const METRIC_JAVA_HEAP_MEMORY_COMMITTED = 'jvm.memory.heap.committed';
export const METRIC_JAVA_HEAP_MEMORY_USED = 'jvm.memory.heap.used';
export const METRIC_JAVA_NON_HEAP_MEMORY_MAX = 'jvm.memory.non_heap.max';
export const METRIC_JAVA_NON_HEAP_MEMORY_COMMITTED = 'jvm.memory.non_heap.committed';
export const METRIC_JAVA_NON_HEAP_MEMORY_USED = 'jvm.memory.non_heap.used';
export const METRIC_JAVA_THREAD_COUNT = 'jvm.thread.count';
export const METRIC_JAVA_GC_COUNT = 'jvm.gc.count';
export const METRIC_JAVA_GC_TIME = 'jvm.gc.time';

export const LABEL_NAME = 'labels.name';

export const HOST = 'host';
export const HOST_HOSTNAME = 'host.hostname';
export const HOST_OS_PLATFORM = 'host.os.platform';
export const CONTAINER_ID = 'container.id';
export const KUBERNETES = 'kubernetes';
export const POD_NAME = 'kubernetes.pod.name';

export const CLIENT_GEO_COUNTRY_ISO_CODE = 'client.geo.country_iso_code';
export const CLIENT_GEO_COUNTRY_NAME = 'client.geo.country_name';

// RUM Labels
export const TRANSACTION_URL = 'url.full';
export const CLIENT_GEO = 'client.geo';
export const USER_AGENT_DEVICE = 'user_agent.device.name';
export const USER_AGENT_OS = 'user_agent.os.name';
export const USER_AGENT_OS_VERSION = 'user_agent.os.version';

export const TRANSACTION_TIME_TO_FIRST_BYTE = 'transaction.marks.agent.timeToFirstByte';
export const TRANSACTION_DOM_INTERACTIVE = 'transaction.marks.agent.domInteractive';

export const FCP_FIELD = 'transaction.marks.agent.firstContentfulPaint';
export const LCP_FIELD = 'transaction.marks.agent.largestContentfulPaint';
export const TBT_FIELD = 'transaction.experience.tbt';
export const FID_FIELD = 'transaction.experience.fid';
export const CLS_FIELD = 'transaction.experience.cls';

export const PROFILE_ID = 'profile.id';
export const PROFILE_DURATION = 'profile.duration';
export const PROFILE_TOP_ID = 'profile.top.id';
export const PROFILE_STACK = 'profile.stack';

export const PROFILE_SAMPLES_COUNT = 'profile.samples.count';
export const PROFILE_CPU_NS = 'profile.cpu.ns';
export const PROFILE_WALL_US = 'profile.wall.us';

export const PROFILE_ALLOC_OBJECTS = 'profile.alloc_objects.count';
export const PROFILE_ALLOC_SPACE = 'profile.alloc_space.bytes';
export const PROFILE_INUSE_OBJECTS = 'profile.inuse_objects.count';
export const PROFILE_INUSE_SPACE = 'profile.inuse_space.bytes';
