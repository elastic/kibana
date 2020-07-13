/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getCoreChrome } from '../../kibana_services';
import { MAP_PATH } from '../../../common/constants';
import _ from 'lodash';
import { getLayerListRaw } from '../../selectors/map_selectors';
import { copyPersistentState } from '../../reducers/util';
import { getStore } from '../store_operations';
import { goToSpecifiedPath } from '../maps_router';

function hasUnsavedChanges(savedMap, initialLayerListConfig) {
  const state = getStore().getState();
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

export const updateBreadcrumbs = (savedMap, initialLayerListConfig, currentPath = '') => {
  const isOnMapNow = currentPath.startsWith(`/${MAP_PATH}`);
  const breadCrumbs = isOnMapNow
    ? [
        {
          text: i18n.translate('xpack.maps.mapController.mapsBreadcrumbLabel', {
            defaultMessage: 'Maps',
          }),
          onClick: () => {
            if (hasUnsavedChanges(savedMap, initialLayerListConfig)) {
              const navigateAway = window.confirm(
                i18n.translate('xpack.maps.breadCrumbs.unsavedChangesWarning', {
                  defaultMessage: `Your unsaved changes might not be saved`,
                })
              );
              if (navigateAway) {
                goToSpecifiedPath('/');
              }
            } else {
              goToSpecifiedPath('/');
            }
          },
        },
        { text: savedMap.title },
      ]
    : [];
  getCoreChrome().setBreadcrumbs(breadCrumbs);
};
