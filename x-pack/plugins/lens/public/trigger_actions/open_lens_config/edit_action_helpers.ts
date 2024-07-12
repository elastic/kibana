/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import './helpers.scss';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { tracksOverlays } from '@kbn/presentation-containers';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isLensEmbeddable } from '../utils';
import type { LensPluginStartDependencies } from '../../plugin';
import { StartServices } from '../../types';

interface Context extends StartServices {
  embeddable: IEmbeddable;
  startDependencies: LensPluginStartDependencies;
  isNewPanel?: boolean;
  deletePanel?: () => void;
}

export async function isEditActionCompatible(embeddable: IEmbeddable) {
  if (!embeddable?.getInput) return false;
  // display the action only if dashboard is on editable mode
  const inDashboardEditMode = embeddable.getInput().viewMode === ViewMode.EDIT;
  return Boolean(isLensEmbeddable(embeddable) && embeddable.getIsEditable() && inDashboardEditMode);
}

type PanelConfigElement<T = {}> = React.ReactElement<T & { closeFlyout: () => void }>;

const openInlineLensConfigEditor = (
  startServices: StartServices,
  embeddable: IEmbeddable,
  EmbeddableInlineConfigEditor: PanelConfigElement
) => {
  const rootEmbeddable = embeddable.getRoot();
  const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;

  const handle = startServices.overlays.openFlyout(
    toMountPoint(
      React.createElement(function InlineLensConfigEditor() {
        React.useEffect(() => {
          document.body.style.overflowY = 'hidden';

          return () => {
            document.body.style.overflowY = 'initial';
          };
        }, []);

        return React.cloneElement(EmbeddableInlineConfigEditor, {
          closeFlyout: () => {
            overlayTracker?.clearOverlays();
            handle.close();
          },
        });
      }),
      startServices
    ),
    {
      size: 's',
      type: 'push',
      paddingSize: 'm',
      'data-test-subj': 'customizeLens',
      className: 'lnsConfigPanel__overlay',
      hideCloseButton: true,
      onClose: (overlayRef) => {
        overlayTracker?.clearOverlays();
        overlayRef.close();
      },
      outsideClickCloses: true,
    }
  );

  overlayTracker?.openOverlay(handle, {
    focusedPanelId: embeddable.id,
  });
};

export async function executeEditAction({
  embeddable,
  startDependencies,
  isNewPanel,
  deletePanel,
  ...startServices
}: Context) {
  const isCompatibleAction = await isEditActionCompatible(embeddable);
  if (!isCompatibleAction || !isLensEmbeddable(embeddable)) {
    throw new IncompatibleActionError();
  }

  const ConfigPanel = await embeddable.openConfigPanel(startDependencies, isNewPanel, deletePanel);

  if (ConfigPanel) {
    openInlineLensConfigEditor(startServices, embeddable, ConfigPanel);
  }
}
