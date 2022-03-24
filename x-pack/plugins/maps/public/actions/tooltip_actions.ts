/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Dispatch } from 'redux';
import { Feature } from 'geojson';
import { getOpenTooltips } from '../selectors/map_selectors';
import { SET_OPEN_TOOLTIPS } from './map_action_constants';
import { FEATURE_VISIBLE_PROPERTY_NAME } from '../../common/constants';
import { TooltipFeature, TooltipState } from '../../common/descriptor_types';
import { MapStoreState } from '../reducers/store';
import { ILayer } from '../classes/layers/layer';
import { IVectorLayer, isVectorLayer } from '../classes/layers/vector_layer';

export function closeOnClickTooltip(tooltipId: string) {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    dispatch({
      type: SET_OPEN_TOOLTIPS,
      openTooltips: getOpenTooltips(getState()).filter(({ id }) => {
        return tooltipId !== id;
      }),
    });
  };
}

export function openOnClickTooltip(tooltipState: TooltipState) {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    const openTooltips = getOpenTooltips(getState()).filter(({ features, location, isLocked }) => {
      return (
        isLocked &&
        !_.isEqual(location, tooltipState.location) &&
        !_.isEqual(features, tooltipState.features)
      );
    });

    openTooltips.push(tooltipState);

    dispatch({
      type: SET_OPEN_TOOLTIPS,
      openTooltips,
    });
  };
}

export function closeOnHoverTooltip() {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    if (getOpenTooltips(getState()).length) {
      dispatch({
        type: SET_OPEN_TOOLTIPS,
        openTooltips: [],
      });
    }
  };
}

export function openOnHoverTooltip(tooltipState: TooltipState) {
  return {
    type: SET_OPEN_TOOLTIPS,
    openTooltips: [tooltipState],
  };
}

export function updateTooltipStateForLayer(layer: ILayer, layerFeatures: Feature[] = []) {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    if (!isVectorLayer(layer)) {
      return;
    }

    const openTooltips = getOpenTooltips(getState())
      .map((tooltipState) => {
        const nextFeatures: TooltipFeature[] = [];
        tooltipState.features.forEach((tooltipFeature) => {
          if (tooltipFeature.layerId !== layer.getId()) {
            // feature from another layer, keep it
            nextFeatures.push(tooltipFeature);
          }

          const updatedFeature = layerFeatures.find((layerFeature) => {
            const isVisible =
              layerFeature.properties![FEATURE_VISIBLE_PROPERTY_NAME] !== undefined
                ? layerFeature.properties![FEATURE_VISIBLE_PROPERTY_NAME]
                : true;
            return (
              isVisible && (layer as IVectorLayer).getFeatureId(layerFeature) === tooltipFeature.id
            );
          });

          if (updatedFeature) {
            nextFeatures.push({
              ...tooltipFeature,
              mbProperties: {
                ...updatedFeature.properties,
              },
            });
          }
        });

        return { ...tooltipState, features: nextFeatures };
      })
      .filter((tooltipState) => {
        return tooltipState.features.length > 0;
      });

    dispatch({
      type: SET_OPEN_TOOLTIPS,
      openTooltips,
    });
  };
}
