/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceStart } from 'src/core/server';
import {
  UIReindex,
  UIReindexOption,
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
} from '../../../common/types';

interface IncrementUIReindexOptionDependencies {
  uiReindexOptionCounter: UIReindexOption;
  savedObjects: SavedObjectsServiceStart;
}

async function incrementUIReindexOptionCounter({
  savedObjects,
  uiReindexOptionCounter,
}: IncrementUIReindexOptionDependencies) {
  const internalRepository = savedObjects.createInternalRepository();

  await internalRepository.incrementCounter(
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID,
    `ui_reindex.${uiReindexOptionCounter}`
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
    await incrementUIReindexOptionCounter({ savedObjects, uiReindexOptionCounter: 'close' });
  }

  if (open) {
    await incrementUIReindexOptionCounter({ savedObjects, uiReindexOptionCounter: 'open' });
  }

  if (start) {
    await incrementUIReindexOptionCounter({ savedObjects, uiReindexOptionCounter: 'start' });
  }

  if (stop) {
    await incrementUIReindexOptionCounter({ savedObjects, uiReindexOptionCounter: 'stop' });
  }

  return {
    close,
    open,
    start,
    stop,
  };
}
