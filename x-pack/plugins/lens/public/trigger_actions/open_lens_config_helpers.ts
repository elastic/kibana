/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { OverlayRef, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { Embeddable } from '../embeddable';
import { DOC_TYPE } from '../../common/constants';
import type { LensPluginStartDependencies } from '../plugin';

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
function isLensEmbeddable(embeddable: IEmbeddable): embeddable is Embeddable {
  return embeddable.type === DOC_TYPE;
}

export async function isActionCompatible(embeddable: IEmbeddable) {
  try {
    return Boolean(isLensEmbeddable(embeddable) && embeddable.isTextBasedLanguage());
  } catch (e) {
    // Fetching underlying data failed, log the error and behave as if the action is not compatible
    // eslint-disable-next-line no-console
    console.error(e);
    return false;
  }
}

export async function executeAction({ embeddable, startDependencies, overlays, theme }: Context) {
  const isCompatibleAction = await isActionCompatible(embeddable);
  if (!isCompatibleAction || !isLensEmbeddable(embeddable)) {
    throw new IncompatibleActionError();
  }
  const rootEmbeddable = embeddable.getRoot();
  const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;
  const ConfigPanel = await embeddable.openConfingPanel(startDependencies);
  const handle = overlays.openFlyout(toMountPoint(ConfigPanel, { theme$: theme.theme$ }), {
    size: 's',
    'data-test-subj': 'customizeLens',
    onClose: (overlayRef) => {
      if (overlayTracker) overlayTracker.clearOverlays();
      overlayRef.close();
    },
    outsideClickCloses: true,
  });
  overlayTracker?.openOverlay(handle);
}
