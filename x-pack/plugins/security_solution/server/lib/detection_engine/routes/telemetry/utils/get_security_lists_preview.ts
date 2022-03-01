/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';

import { PreviewTelemetryEventsSender } from '../../../../telemetry/preview_sender';
import { ITelemetryReceiver } from '../../../../telemetry/receiver';
import { ITelemetryEventsSender } from '../../../../telemetry/sender';
import { createTelemetrySecurityListTaskConfig } from '../../../../telemetry/tasks/security_lists';
import { parseNdjson } from './parse_ndjson';

export const getSecurityListsPreview = async ({
  logger,
  telemetryReceiver,
  telemetrySender,
}: {
  logger: Logger;
  telemetryReceiver: ITelemetryReceiver;
  telemetrySender: ITelemetryEventsSender;
}): Promise<object[][]> => {
  const taskExecutionPeriod = {
    last: new Date(0).toISOString(),
    current: new Date().toISOString(),
  };

  const taskSender = new PreviewTelemetryEventsSender(logger, telemetrySender);
  const task = createTelemetrySecurityListTaskConfig(1000);
  await task.runTask(
    'security-lists-preview',
    logger,
    telemetryReceiver,
    taskSender,
    taskExecutionPeriod
  );
  const messages = taskSender.getSentMessages();
  return parseNdjson(messages);
};
