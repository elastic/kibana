/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { LayerAction, StateSetter } from '../../../../types';
import { XYState, XYAnnotationLayerConfig } from '../../types';
import { getUnlinkLayerAction } from './unlink_action';
import { getIgnoreFilterAction } from './ignore_filters_action';
import { getSaveLayerAction } from './save_action';
import { isByReferenceAnnotationsLayer } from '../../visualization_helpers';
export {
  IGNORE_GLOBAL_FILTERS_ACTION_ID,
  KEEP_GLOBAL_FILTERS_ACTION_ID,
} from './ignore_filters_action';

export const createAnnotationActions = ({
  state,
  layer,
  layerIndex,
  setState,
  core,
  isSaveable,
  eventAnnotationService,
  savedObjectsTagging,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
  core: CoreStart;
  isSaveable?: boolean;
  eventAnnotationService: EventAnnotationServiceType;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
}): LayerAction[] => {
  const actions = [];

  const savingToLibraryPermitted = Boolean(
    core.application.capabilities.visualize.save && isSaveable
  );

  if (savingToLibraryPermitted) {
    actions.push(
      getSaveLayerAction({
        state,
        layer,
        setState,
        eventAnnotationService,
        toasts: core.notifications.toasts,
        savedObjectsTagging,
      })
    );
  }

  if (isByReferenceAnnotationsLayer(layer)) {
    actions.push(
      getUnlinkLayerAction({
        execute: () => {
          const title = 'Annotation group name'; // TODO: pass the title from Annotation group state
          // save to Lens Saved object state - there's nothing we should do with the Annotation group Saved Object
          // update Lens state
          core.notifications.toasts.addSuccess(
            i18n.translate('xpack.lens.xyChart.annotations.notificationUnlinked', {
              defaultMessage: `Unlinked “{title}“ from library`,
              values: { title },
            })
          );
        },
        core,
      })
    );
  }

  actions.push(getIgnoreFilterAction({ state, layer, layerIndex, setState }));

  return actions;
};
