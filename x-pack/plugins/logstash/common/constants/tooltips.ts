/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TOOLTIPS = {
  settings: {
    'pipeline.workers': i18n.translate('xpack.logstash.workersTooltip', {
      defaultMessage:
        'The number of workers that will, in parallel, execute the filter and ' +
        'output stages of the pipeline. If you find that events are backing up, ' +
        'or that the CPU is not saturated, consider increasing this number to ' +
        'better utilize machine processing power.\n\n' +
        'Default value: Number of the host’s CPU cores',
    }),

    'pipeline.batch.size': i18n.translate('xpack.logstash.pipelineBatchSizeTooltip', {
      defaultMessage:
        'The maximum number of events an individual worker thread will collect ' +
        'from inputs before attempting to execute its filters and outputs. Larger ' +
        'batch sizes are generally more efficient, but come at the cost of increased ' +
        'memory overhead. You may have to increase the JVM heap size by setting the ' +
        'LS_HEAP_SIZE variable to effectively use the option.\n\n' +
        'Default value: 125',
    }),

    'pipeline.batch.delay': i18n.translate('xpack.logstash.pipelineBatchDelayTooltip', {
      defaultMessage:
        'When creating pipeline event batches, how long in milliseconds to wait ' +
        'for each event before dispatching an undersized batch to pipeline workers.\n\n' +
        'Default value: 50ms',
    }),

    'queue.type': i18n.translate('xpack.logstash.queueTypeTooltip', {
      defaultMessage:
        'The internal queuing model to use for event buffering. Specify memory for ' +
        'legacy in-memory based queuing, or persisted for disk-based ACKed queueing\n\n' +
        'Default value: memory',
    }),

    'queue.max_bytes': i18n.translate('xpack.logstash.queueMaxBytesTooltip', {
      defaultMessage:
        'The total capacity of the queue in number of bytes. Make sure the ' +
        'capacity of your disk drive is greater than the value you specify here.\n\n' +
        'Default value: 1024mb (1g)',
    }),

    'queue.checkpoint.writes': i18n.translate('xpack.logstash.queueCheckpointWritesTooltip', {
      defaultMessage:
        'The maximum number of written events before forcing a checkpoint when ' +
        'persistent queues are enabled. Specify 0 to set this value to unlimited.\n\n' +
        'Default value: 1024',
    }),
  },
};
