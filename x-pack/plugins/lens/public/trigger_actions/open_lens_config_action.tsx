/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import React from 'react';
import { i18n } from '@kbn/i18n';
// import { createAction } from '@kbn/ui-actions-plugin/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { OverlayRef, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { Embeddable } from '../embeddable';
import { DOC_TYPE } from '../../common/constants';
import type { LensPluginStartDependencies } from '../plugin';

const ACTION_CONFIGURE_IN_LENS = 'ACTION_CONFIGURE_IN_LENS';

interface Context {
  embeddable: IEmbeddable;
}

// type VisualizeEmbeddable = IEmbeddable<{ id: string }, EmbeddableOutput & { visTypeName: string }>;

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
export class ConfigureInLensPanelAction implements Action<Context> {
  public type = ACTION_CONFIGURE_IN_LENS;
  public id = ACTION_CONFIGURE_IN_LENS;
  public order = 50;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly overlays: OverlayStart,
    protected readonly theme: ThemeServiceStart
  ) {}

  public getDisplayName({ embeddable }: Context): string {
    return i18n.translate('xpack.lens.app.configureInLens', {
      defaultMessage: 'Configure in Lens',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: Context) {
    return Boolean(isLensEmbeddable(embeddable) && embeddable.isTextBasedLanguage());
  }

  public async execute({ embeddable }: Context) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible || !isLensEmbeddable(embeddable)) {
      throw new IncompatibleActionError();
    }

    // send the overlay ref to the root embeddable if it is capable of tracking overlays
    const rootEmbeddable = embeddable.getRoot();
    // console.log(rootEmbeddable);
    const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;
    const ConfigPanel = await embeddable.openConfingPanel(this.startDependencies);
    const handle = this.overlays.openFlyout(
      toMountPoint(ConfigPanel, { theme$: this.theme.theme$ }),
      {
        size: 's',
        'data-test-subj': 'customizeLens',
        onClose: (overlayRef) => {
          if (overlayTracker) overlayTracker.clearOverlays();
          overlayRef.close();
        },
      }
    );
    overlayTracker?.openOverlay(handle);
  }
}
