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
import { TooltipState } from '../../common/descriptor_types';
import { MapStoreState } from '../reducers/store';
import { ILayer } from '../classes/layers/layer';
import { IVectorLayer, getFeatureId, isVectorLayer } from '../classes/layers/vector_layer';

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

export function cleanTooltipStateForLayer(layer: ILayer, layerFeatures: Feature[] = []) {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    if (!isVectorLayer(layer)) {
      return;
    }

    let featuresRemoved = false;
    const openTooltips = getOpenTooltips(getState())
      .map((tooltipState) => {
        const nextFeatures = tooltipState.features.filter((tooltipFeature) => {
          if (tooltipFeature.layerId !== layer.getId()) {
            // feature from another layer, keep it
            return true;
          }

          // Keep feature if it is still in layer
          return layerFeatures.some((layerFeature) => {
            return getFeatureId(layerFeature, (layer as IVectorLayer).getSource()) === tooltipFeature.id;
          });
        });

        if (tooltipState.features.length !== nextFeatures.length) {
          featuresRemoved = true;
        }

        return { ...tooltipState, features: nextFeatures };
      })
      .filter((tooltipState) => {
        return tooltipState.features.length > 0;
      });

    if (featuresRemoved) {
      dispatch({
        type: SET_OPEN_TOOLTIPS,
        openTooltips,
      });
    }
  };
}
