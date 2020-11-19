/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasShareableState } from '../types';
import { CanvasShareableAction, CanvasShareableActions } from './actions';

/**
 * The Action Reducer for the Shareable Canvas Workpad interface.
 */
export const reducer = (
  state: CanvasShareableState,
  action: CanvasShareableAction
): CanvasShareableState => {
  switch (action.type) {
    case CanvasShareableActions.SET_PAGE: {
      const { stage } = state;
      return {
        ...state,
        stage: {
          ...stage,
          page: action.payload.page,
        },
      };
    }

    case CanvasShareableActions.SET_SCRUBBER_VISIBLE: {
      const { footer } = state;

      return {
        ...state,
        footer: {
          ...footer,
          isScrubberVisible: action.payload.visible,
        },
      };
    }

    case CanvasShareableActions.SET_AUTOPLAY: {
      const { settings } = state;
      const { autoplay } = settings;
      const { isEnabled } = action.payload;

      return {
        ...state,
        settings: {
          ...settings,
          autoplay: {
            ...autoplay,
            isEnabled,
          },
        },
      };
    }

    case CanvasShareableActions.SET_AUTOPLAY_INTERVAL: {
      const { settings } = state;
      const { autoplay } = settings;
      const { interval } = action.payload;

      return {
        ...state,
        settings: {
          ...settings,
          autoplay: {
            ...autoplay,
            interval,
          },
        },
      };
    }

    case CanvasShareableActions.SET_TOOLBAR_AUTOHIDE: {
      const { settings } = state;
      const { toolbar } = settings;
      const { isAutohide } = action.payload;

      return {
        ...state,
        settings: {
          ...settings,
          toolbar: {
            ...toolbar,
            isAutohide,
          },
        },
      };
    }

    default: {
      return state;
    }
  }
};
