/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import './helpers.scss';
import { tracksOverlays } from '@kbn/presentation-containers';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiHasParentApi, HasEditCapabilities } from '@kbn/presentation-publishing';
import { StartServices } from '../../types';
import { isLensApi } from '../../react_embeddable/type_guards';

interface Context extends StartServices {
  api: unknown;
  isNewPanel?: boolean;
  deletePanel?: () => void;
}

export function isEditActionCompatible(api: unknown) {
  return Boolean(
    api &&
      // limit the action to Lens panels
      isLensApi(api) &&
      (api as HasEditCapabilities).isEditingEnabled &&
      typeof (api as HasEditCapabilities).isEditingEnabled === 'function' &&
      (api as HasEditCapabilities).isEditingEnabled()
  );
}

export async function executeEditAction({
  api,
  isNewPanel,
  deletePanel,
  ...startServices
}: Context) {
  const isCompatibleAction = await isEditActionCompatible(api);
  if (!isCompatibleAction || !isLensApi(api) || !apiHasParentApi(api)) {
    throw new IncompatibleActionError();
  }
  const rootEmbeddable = api.parentApi;
  const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;
  const ConfigPanel = await api.openConfigPanel(isNewPanel, deletePanel);

  if (ConfigPanel) {
    const handle = startServices.overlays.openFlyout(
      toMountPoint(
        React.cloneElement(ConfigPanel, {
          closeFlyout: () => {
            if (overlayTracker) overlayTracker.clearOverlays();
            handle.close();
          },
        }),
        startServices
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
    overlayTracker?.openOverlay(handle, { focusedPanelId: api.uuid });
  }
}
