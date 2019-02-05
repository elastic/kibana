/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import {
  UIReindex,
  UIReindexOption,
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
  UpgradeAssistantTelemetryServer,
} from '../../../common/types';

async function incrementUIReindexOptionCounter(
  server: UpgradeAssistantTelemetryServer,
  uiOpenOptionCounter: UIReindexOption
) {
  const { getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);

  await internalRepository.incrementCounter(
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID,
    `ui_reindex.${uiOpenOptionCounter}`
  );
}

export async function upsertUIReindexOption(
  server: UpgradeAssistantTelemetryServer,
  req: Legacy.Request
): Promise<UIReindex> {
  const { close, open, start, stop } = req.payload as UIReindex;

  if (close) {
    await incrementUIReindexOptionCounter(server, 'close');
  }

  if (open) {
    await incrementUIReindexOptionCounter(server, 'open');
  }

  if (start) {
    await incrementUIReindexOptionCounter(server, 'start');
  }

  if (stop) {
    await incrementUIReindexOptionCounter(server, 'stop');
  }

  return {
    close,
    open,
    start,
    stop,
  };
}
