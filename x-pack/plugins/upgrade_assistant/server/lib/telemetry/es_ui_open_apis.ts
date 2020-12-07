/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceStart } from 'src/core/server';
import {
  UIOpen,
  UIOpenOption,
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
} from '../../../common/types';

interface IncrementUIOpenDependencies {
  uiOpenOptionCounter: UIOpenOption;
  savedObjects: SavedObjectsServiceStart;
}

async function incrementUIOpenOptionCounter({
  savedObjects,
  uiOpenOptionCounter,
}: IncrementUIOpenDependencies) {
  const internalRepository = savedObjects.createInternalRepository();

  await internalRepository.incrementCounter(UPGRADE_ASSISTANT_TYPE, UPGRADE_ASSISTANT_DOC_ID, [
    `ui_open.${uiOpenOptionCounter}`,
  ]);
}

type UpsertUIOpenOptionDependencies = UIOpen & { savedObjects: SavedObjectsServiceStart };

export async function upsertUIOpenOption({
  overview,
  cluster,
  indices,
  savedObjects,
}: UpsertUIOpenOptionDependencies): Promise<UIOpen> {
  if (overview) {
    await incrementUIOpenOptionCounter({ savedObjects, uiOpenOptionCounter: 'overview' });
  }

  if (cluster) {
    await incrementUIOpenOptionCounter({ savedObjects, uiOpenOptionCounter: 'cluster' });
  }

  if (indices) {
    await incrementUIOpenOptionCounter({ savedObjects, uiOpenOptionCounter: 'indices' });
  }

  return {
    overview,
    cluster,
    indices,
  };
}
