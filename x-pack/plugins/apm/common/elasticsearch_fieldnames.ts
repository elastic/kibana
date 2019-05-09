/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const SERVICE_NAME = 'service.name';
export const SERVICE_AGENT_NAME = 'agent.name';
export const URL_FULL = 'url.full';
export const HTTP_REQUEST_METHOD = 'http.request.method';
export const USER_ID = 'user.id';

export const OBSERVER_VERSION_MAJOR = 'observer.version_major';
export const OBSERVER_LISTENING = 'observer.listening';
export const PROCESSOR_EVENT = 'processor.event';

export const TRANSACTION_DURATION = 'transaction.duration.us';
export const TRANSACTION_TYPE = 'transaction.type';
export const TRANSACTION_RESULT = 'transaction.result';
export const TRANSACTION_NAME = 'transaction.name';
export const TRANSACTION_ID = 'transaction.id';
export const TRANSACTION_SAMPLED = 'transaction.sampled';

export const TRACE_ID = 'trace.id';

export const SPAN_DURATION = 'span.duration.us';
export const SPAN_TYPE = 'span.type';
export const SPAN_SUBTYPE = 'span.subtype';
export const SPAN_ACTION = 'span.action';
export const SPAN_NAME = 'span.name';
export const SPAN_ID = 'span.id';

// Parent ID for a transaction or span
export const PARENT_ID = 'parent.id';

export const ERROR_GROUP_ID = 'error.grouping_key';
export const ERROR_CULPRIT = 'error.culprit';
export const ERROR_LOG_MESSAGE = 'error.log.message';
export const ERROR_EXC_MESSAGE = 'error.exception.message'; // only to be used in es queries, since error.exception is now an array
export const ERROR_EXC_HANDLED = 'error.exception.handled'; // only to be used in es queries, since error.exception is now an array

// METRICS
export const METRIC_SYSTEM_FREE_MEMORY = 'system.memory.actual.free';
export const METRIC_SYSTEM_TOTAL_MEMORY = 'system.memory.total';
export const METRIC_SYSTEM_CPU_PERCENT = 'system.cpu.total.norm.pct';
export const METRIC_PROCESS_CPU_PERCENT = 'system.process.cpu.total.norm.pct';

export const METRIC_JAVA_HEAP_MEMORY_MAX = 'jvm.memory.heap.max';
export const METRIC_JAVA_HEAP_MEMORY_COMMITTED = 'jvm.memory.heap.committed';
export const METRIC_JAVA_HEAP_MEMORY_USED = 'jvm.memory.heap.used';
export const METRIC_JAVA_NON_HEAP_MEMORY_MAX = 'jvm.memory.non_heap.max';
export const METRIC_JAVA_NON_HEAP_MEMORY_COMMITTED =
  'jvm.memory.non_heap.committed';
export const METRIC_JAVA_NON_HEAP_MEMORY_USED = 'jvm.memory.non_heap.used';
export const METRIC_JAVA_THREAD_COUNT = 'jvm.thread.count';
