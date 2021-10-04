/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  elasticsearch,
  savedObjects,
  kibana,
}: UpsertUIOpenOptionDependencies): Promise<UIOpen> {
  if (overview) {
    await incrementUIOpenOptionCounter({ savedObjects, uiOpenOptionCounter: 'overview' });
  }

  if (elasticsearch) {
    await incrementUIOpenOptionCounter({ savedObjects, uiOpenOptionCounter: 'elasticsearch' });
  }

  if (kibana) {
    await incrementUIOpenOptionCounter({ savedObjects, uiOpenOptionCounter: 'kibana' });
  }

  return {
    overview,
    elasticsearch,
    kibana,
  };
}
