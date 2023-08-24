/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import './helpers.scss';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { OverlayRef, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isLensEmbeddable } from '../utils';
import type { LensPluginStartDependencies } from '../../plugin';

interface Context {
  embeddable: IEmbeddable;
  startDependencies: LensPluginStartDependencies;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
}

interface TracksOverlays {
  openOverlay: (ref: OverlayRef) => void;
  clearOverlays: () => void;
}

function tracksOverlays(root: unknown): root is TracksOverlays {
  return Boolean((root as TracksOverlays).openOverlay && (root as TracksOverlays).clearOverlays);
}

export async function isActionCompatible(embeddable: IEmbeddable) {
  return Boolean(isLensEmbeddable(embeddable) && embeddable.isTextBasedLanguage());
}

export async function executeAction({ embeddable, startDependencies, overlays, theme }: Context) {
  const isCompatibleAction = await isActionCompatible(embeddable);
  if (!isCompatibleAction || !isLensEmbeddable(embeddable)) {
    throw new IncompatibleActionError();
  }
  const rootEmbeddable = embeddable.getRoot();
  const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;
  const ConfigPanel = await embeddable.openConfingPanel(startDependencies);
  if (ConfigPanel) {
    const handle = overlays.openFlyout(
      toMountPoint(
        React.cloneElement(ConfigPanel, {
          closeFlyout: () => {
            if (overlayTracker) overlayTracker.clearOverlays();
            handle.close();
          },
        }),
        {
          theme$: theme.theme$,
        }
      ),
      {
        className: 'lnsConfigPanel__overlay',
        size: 's',
        'data-test-subj': 'customizeLens',
        type: 'push',
        hideCloseButton: true,
        onClose: (overlayRef) => {
          if (overlayTracker) overlayTracker.clearOverlays();
          overlayRef.close();
        },
        outsideClickCloses: true,
      }
    );
    overlayTracker?.openOverlay(handle);
  }
}
