/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Dispatch } from 'redux';
import { getOpenTooltips } from '../selectors/map_selectors';
import { SET_OPEN_TOOLTIPS } from './map_action_constants';
import { TooltipState } from '../../common/descriptor_types';
import { MapStoreState } from '../reducers/store';

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
        !_.isEqual(
          features.map(({ id, layerId }) => {
            return { id, layerId };
          }), 
          tooltipState.features.map(({ id, layerId }) => {
            return { id, layerId };
          })
        )
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

export function updateOpenTooltips(openTooltips: TooltipState[]) {
  return {
    type: SET_OPEN_TOOLTIPS,
    openTooltips,
  };
}
