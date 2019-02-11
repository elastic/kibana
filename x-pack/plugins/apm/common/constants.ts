/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const SERVICE_NAME = 'service.name';
export const SERVICE_AGENT_NAME = 'agent.name';
export const SERVICE_LANGUAGE_NAME = 'service.language.name';
export const URL_FULL = 'url.full';
export const HTTP_REQUEST_METHOD = 'http.request.method';
export const USER_ID = 'user.id';

export const OBSERVER_LISTENING = 'observer.listening';

export const PROCESSOR_NAME = 'processor.name';
export const PROCESSOR_EVENT = 'processor.event';

export const TRANSACTION_DURATION = 'transaction.duration.us';
export const TRANSACTION_TYPE = 'transaction.type';
export const TRANSACTION_RESULT = 'transaction.result';
export const TRANSACTION_NAME = 'transaction.name';
export const TRANSACTION_ID = 'transaction.id';
export const TRANSACTION_SAMPLED = 'transaction.sampled';

export const TRACE_ID = 'trace.id';

export const SPAN_START = 'span.start.us';
export const SPAN_DURATION = 'span.duration.us';
export const SPAN_TYPE = 'span.type';
export const SPAN_NAME = 'span.name';
export const SPAN_ID = 'span.id';
export const SPAN_SQL = 'context.db.statement';

// Parent ID for a transaction or span
export const PARENT_ID = 'parent.id';

export const ERROR_GROUP_ID = 'error.grouping_key';
export const ERROR_CULPRIT = 'error.culprit';
export const ERROR_LOG_MESSAGE = 'error.log.message';
export const ERROR_LOG_STACKTRACE = 'error.log.stacktrace';
export const ERROR_EXC_MESSAGE = 'error.exception.message';
export const ERROR_EXC_STACKTRACE = 'error.exception.stacktrace';
export const ERROR_EXC_HANDLED = 'error.exception.handled';

// METRICS
export const METRIC_SYSTEM_FREE_MEMORY = 'system.memory.actual.free';
export const METRIC_SYSTEM_TOTAL_MEMORY = 'system.memory.total';
export const METRIC_PROCESS_MEMORY_SIZE = 'system.process.memory.size';
export const METRIC_PROCESS_MEMORY_RSS = 'system.process.memory.rss.bytes';

export const METRIC_SYSTEM_CPU_PERCENT = 'system.cpu.total.norm.pct';
export const METRIC_PROCESS_CPU_PERCENT = 'system.process.cpu.total.norm.pct';
