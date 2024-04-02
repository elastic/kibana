/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import './helpers.scss';
import { tracksOverlays } from '@kbn/presentation-containers';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isLensEmbeddable } from '../utils';
import type { LensPluginStartDependencies } from '../../plugin';

interface Context {
  embeddable: IEmbeddable;
  startDependencies: LensPluginStartDependencies;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  isNewPanel?: boolean;
  deletePanel?: () => void;
}

export async function isEditActionCompatible(embeddable: IEmbeddable) {
  if (!embeddable?.getInput) return false;
  // display the action only if dashboard is on editable mode
  const inDashboardEditMode = embeddable.getInput().viewMode === 'edit';
  return Boolean(isLensEmbeddable(embeddable) && embeddable.getIsEditable() && inDashboardEditMode);
}

export async function executeEditAction({
  embeddable,
  startDependencies,
  overlays,
  theme,
  isNewPanel,
  deletePanel,
}: Context) {
  const isCompatibleAction = await isEditActionCompatible(embeddable);
  if (!isCompatibleAction || !isLensEmbeddable(embeddable)) {
    throw new IncompatibleActionError();
  }
  const rootEmbeddable = embeddable.getRoot();
  const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;
  const ConfigPanel = await embeddable.openConfingPanel(startDependencies, isNewPanel, deletePanel);

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
        paddingSize: 'm',
        hideCloseButton: true,
        onClose: (overlayRef) => {
          if (overlayTracker) overlayTracker.clearOverlays();
          overlayRef.close();
        },
        outsideClickCloses: true,
      }
    );
    overlayTracker?.openOverlay(handle, { focusedPanelId: embeddable.id });
  }
}
