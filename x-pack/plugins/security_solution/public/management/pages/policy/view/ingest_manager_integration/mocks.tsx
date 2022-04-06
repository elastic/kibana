/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, FC } from 'react';
import { Action, Reducer } from 'redux';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render as reactRender } from '@testing-library/react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
  UiRender,
} from '../../../../../common/mock/endpoint';
import { createFleetContextReduxStore } from './with_security_context/store';
import { ExperimentalFeatures } from '../../../../../../common/experimental_features';
import { State } from '../../../../../common/store';
import { mockGlobalState } from '../../../../../common/mock';
import { managementReducer } from '../../../../store/reducer';
import { appReducer } from '../../../../../common/store/app';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';
import { RenderContextProviders } from './with_security_context/render_context_providers';
import { AppAction } from '../../../../../common/store/actions';

// Defined a private custom reducer that reacts to an action that enables us to update the
// store with new values for technical preview features/flags. Because the `action.type` is a `Symbol`,
// and its not exported the action can only be `dispatch`'d from this module
const UpdateExperimentalFeaturesTestActionType = Symbol('updateExperimentalFeaturesTestAction');

type UpdateExperimentalFeaturesTestAction = Action<
  typeof UpdateExperimentalFeaturesTestActionType
> & {
  payload: Partial<ExperimentalFeatures>;
};

const experimentalFeaturesReducer: Reducer<
  State['app'],
  AppAction | UpdateExperimentalFeaturesTestAction
> = (state = mockGlobalState.app, action) => {
  if (action.type === UpdateExperimentalFeaturesTestActionType) {
    return {
      ...state,
      enableExperimental: {
        ...state.enableExperimental,
        ...action.payload,
      },
    };
  }
  return state;
};

export const createFleetContextRendererMock = <P extends {}>(
  Component: ComponentType<P>
): AppContextTestRender => {
  const mockedContext = createAppRootMockRenderer();
  const store = createFleetContextReduxStore({
    coreStart: mockedContext.coreStart,
    depsStart: mockedContext.depsStart,
    reducersObject: {
      management: managementReducer,
      app: (state, action: AppAction | UpdateExperimentalFeaturesTestAction) => {
        return appReducer(experimentalFeaturesReducer(state, action), action);
      },
    },
    preloadedState: {
      // @ts-expect-error TS2322
      management: undefined,
      // @ts-expect-error TS2322
      app: {
        enableExperimental: ExperimentalFeaturesService.get(),
      },
    },
    additionalMiddleware: [mockedContext.middlewareSpy.actionSpyMiddleware],
  });

  const Wrapper: FC = ({ children }) => {
    return (
      <RenderContextProviders store={store} depsStart={mockedContext.depsStart}>
        {children}
      </RenderContextProviders>
    );
  };

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: Wrapper as React.ComponentType,
      ...options,
    });
  };

  const setExperimentalFlag: AppContextTestRender['setExperimentalFlag'] = (flags) => {
    store.dispatch({
      type: UpdateExperimentalFeaturesTestActionType,
      payload: flags,
    });
  };

  return {
    ...mockedContext,
    store,
    render,
    setExperimentalFlag,
  };
};
