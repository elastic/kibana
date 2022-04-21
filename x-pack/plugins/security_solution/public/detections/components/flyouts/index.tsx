/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React, { useReducer, Dispatch, createContext, useContext } from 'react';
import { OsqueryFlyout } from '../osquery/osquery_flyout';
import { EventFiltersFlyout } from '../../../management/pages/event_filters/view/components/flyout';
import { Ecs } from '../../../../common/ecs';

type FlyoutType = string;

export interface State {
  currentFlyout: FlyoutType | null;
  payload: Record<string, unknown>;
}

export const initialState: State = {
  currentFlyout: null,
  payload: {},
};

export type Action =
  | { type: null }
  | {
      type: FlyoutTypes.OSQUERY;
      payload: {
        agentId: string;
        onClose: () => void;
      };
    }
  | {
      type: FlyoutTypes.EVENT_FILTER;
      payload: {
        ecsData: Ecs | null;
        closeAddEventFilterModal: () => void;
      };
    };

export enum FlyoutTypes {
  OSQUERY = 'osquery',
  EVENT_FILTER = 'event_filter',
}

export const securityFlyoutReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case FlyoutTypes.OSQUERY: {
      return {
        ...state,
        currentFlyout: FlyoutTypes.OSQUERY,
        payload: action.payload,
      };
    }
    case FlyoutTypes.EVENT_FILTER: {
      return {
        ...state,
        currentFlyout: FlyoutTypes.EVENT_FILTER,
        payload: action.payload,
      };
    }
    default:
      return {
        currentFlyout: null,
        payload: {},
      };
  }
};

const FlyoutContext = createContext<[State, Dispatch<Action>]>([initialState, () => noop]);

export const useFlyoutData = () => useContext(FlyoutContext);

interface ManageUserInfoProps {
  children: React.ReactNode;
}

interface ISecurityFlyout {
  FlyoutComponent: () => JSX.Element | null;
  flyoutDispatch: Dispatch<Action>;
}

export const useSecurityFlyout = (): ISecurityFlyout => {
  const [data, dispatch] = useFlyoutData();
  const FlyoutComponent = () => {
    switch (data.currentFlyout) {
      case FlyoutTypes.OSQUERY:
        const { agentId, onClose } = data.payload as { agentId: string; onClose: () => void };

        return <OsqueryFlyout agentId={agentId} onClose={onClose} />;
      case FlyoutTypes.EVENT_FILTER:
        const { ecs, closeAddEventFilterModal, ...rest } = data.payload as {
          ecs: Ecs;
          closeAddEventFilterModal: () => null;
        };

        return <EventFiltersFlyout data={ecs} onCancel={closeAddEventFilterModal} {...rest} />;
      default:
        return null;
    }
  };
  return {
    FlyoutComponent,
    flyoutDispatch: dispatch,
  };
};

export const FlyoutProvider = ({ children }: ManageUserInfoProps) => (
  <FlyoutContext.Provider value={useReducer(securityFlyoutReducer, initialState)}>
    {children}
  </FlyoutContext.Provider>
);
