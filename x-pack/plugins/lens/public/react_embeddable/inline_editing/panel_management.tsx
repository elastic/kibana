/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { BehaviorSubject } from 'rxjs';
import { LensRuntimeState } from '../types';

export interface PanelManagementApi {
  isEditingEnabled: () => boolean;
  isNewPanel: () => boolean;
  onStopEditing: (isCancel: boolean, state: LensRuntimeState | undefined) => void;
}

export function setupPanelManagement(
  uuid: string,
  parentApi: unknown,
  { canBeCreatedInline }: { canBeCreatedInline: boolean }
): PanelManagementApi {
  const isEditing$ = new BehaviorSubject(false);
  const isNewlyCreated$ = new BehaviorSubject(true);

  // Remove this once the inline creation is fully supported
  if (!canBeCreatedInline) {
    isNewlyCreated$.next(!canBeCreatedInline);
  }

  return {
    isEditingEnabled: () => !isEditing$.getValue(),
    isNewPanel: () => isNewlyCreated$.getValue(),
    onStopEditing: (isCancel: boolean = false, state: LensRuntimeState | undefined) => {
      isEditing$.next(false);
      if (isNewlyCreated$.getValue() && isCancel && !state) {
        if (apiIsPresentationContainer(parentApi)) {
          parentApi?.removePanel(uuid);
        }
      }
      isNewlyCreated$.next(false);
    },
  };
}
