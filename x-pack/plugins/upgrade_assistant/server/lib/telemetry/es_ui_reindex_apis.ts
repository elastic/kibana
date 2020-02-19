/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceStart } from 'kibana/server';
import {
  UIReindex,
  UIReindexOption,
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
} from '../../../common/types';

interface IncrementUIReindexOptionDependencies {
  uiOpenOptionCounter: UIReindexOption;
  savedObjects: SavedObjectsServiceStart;
}

async function incrementUIReindexOptionCounter({
  savedObjects,
  uiOpenOptionCounter,
}: IncrementUIReindexOptionDependencies) {
  const internalRepository = savedObjects.createInternalRepository();

  await internalRepository.incrementCounter(
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID,
    `ui_reindex.${uiOpenOptionCounter}`
  );
}

type UpsertUIReindexOptionDepencies = UIReindex & { savedObjects: SavedObjectsServiceStart };

export async function upsertUIReindexOption({
  start,
  close,
  open,
  stop,
  savedObjects,
}: UpsertUIReindexOptionDepencies): Promise<UIReindex> {
  if (close) {
    await incrementUIReindexOptionCounter({ savedObjects, uiOpenOptionCounter: 'close' });
  }

  if (open) {
    await incrementUIReindexOptionCounter({ savedObjects, uiOpenOptionCounter: 'open' });
  }

  if (start) {
    await incrementUIReindexOptionCounter({ savedObjects, uiOpenOptionCounter: 'start' });
  }

  if (stop) {
    await incrementUIReindexOptionCounter({ savedObjects, uiOpenOptionCounter: 'stop' });
  }

  return {
    close,
    open,
    start,
    stop,
  };
}
