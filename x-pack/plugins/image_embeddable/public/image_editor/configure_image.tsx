/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OverlayStart, ApplicationStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { skip, take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ImageConfig } from '../types';
import { ImageEditorFlyout } from './image_editor_flyout';

/**
 * @throws in case user cancels
 */
export async function configureImage(deps: {
  overlays: OverlayStart;
  currentAppId$: ApplicationStart['currentAppId$'];
}): Promise<{
  imageConfig: ImageConfig;
  references: unknown[];
}> {
  return new Promise((resolve, reject) => {
    const closed$ = new Subject<true>();

    const onSave = (config: { imageConfig: ImageConfig; references: unknown[] }) => {
      resolve(config);
      handle.close();
    };

    const onCancel = () => {
      reject();
      handle.close();
    };

    // Close the flyout on application change.
    deps.currentAppId$.pipe(takeUntil(closed$), skip(1), take(1)).subscribe(() => {
      handle.close();
    });

    const handle = deps.overlays.openFlyout(
      toMountPoint(<ImageEditorFlyout onCancel={onCancel} onSave={onSave} />),
      {
        ownFocus: true,
        'data-test-subj': 'createImageEmbeddableFlyout',
      }
    );

    handle.onClose.then(() => {
      closed$.next(true);
    });
  });
}
