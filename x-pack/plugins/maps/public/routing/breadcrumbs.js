/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getCoreChrome } from '../kibana_services';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import _ from 'lodash';
import { getLayerListRaw } from '../selectors/map_selectors';
import { copyPersistentState } from '../reducers/util';

function isOnMapNow() {
  return window.location.hash.startsWith(`#/${MAP_SAVED_OBJECT_TYPE}`);
}

function hasUnsavedChanges(store, savedMap, initialLayerListConfig) {
  const state = store.getState();
  const layerList = getLayerListRaw(state);
  const layerListConfigOnly = copyPersistentState(layerList);

  const savedLayerList = savedMap.getLayerList();

  return !savedLayerList
    ? !_.isEqual(layerListConfigOnly, initialLayerListConfig)
    : // savedMap stores layerList as a JSON string using JSON.stringify.
      // JSON.stringify removes undefined properties from objects.
      // savedMap.getLayerList converts the JSON string back into Javascript array of objects.
      // Need to perform the same process for layerListConfigOnly to compare apples to apples
      // and avoid undefined properties in layerListConfigOnly triggering unsaved changes.
      !_.isEqual(JSON.parse(JSON.stringify(layerListConfigOnly)), savedLayerList);
}

export const updateBreadcrumbs = (store, savedMap, initialLayerListConfig) => {
  getCoreChrome().setBreadcrumbs([
    {
      text: i18n.translate('xpack.maps.mapController.mapsBreadcrumbLabel', {
        defaultMessage: 'Maps',
      }),
      onClick: () => {
        if (isOnMapNow() && hasUnsavedChanges(store, savedMap, initialLayerListConfig)) {
          const navigateAway = window.confirm(
            i18n.translate('xpack.maps.mapController.unsavedChangesWarning', {
              defaultMessage: `Your unsaved changes might not be saved`,
            })
          );
          if (navigateAway) {
            window.location.hash = '#';
          }
        } else {
          window.location.hash = '#';
        }
      },
    },
    { text: savedMap.title },
  ]);
};
