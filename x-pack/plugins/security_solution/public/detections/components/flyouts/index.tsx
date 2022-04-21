/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React, { useReducer, Dispatch, createContext, useContext } from 'react';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { AddExceptionModalWrapperData } from '../alerts_table/timeline_actions/use_add_exception_flyout';
import { AddExceptionFlyoutWrapper } from '../alerts_table/timeline_actions/alert_context_menu';
import { OsqueryFlyout } from '../osquery/osquery_flyout';
import { EventFiltersFlyout } from '../../../management/pages/event_filters/view/components/flyout';
import { Ecs } from '../../../../common/ecs';

type FlyoutType = string;

export interface State {
  currentFlyout: FlyoutType | null;
  payload: IAddExceptionPayload | IOsqueryPayload | IEvenFilterPayload | null;
}

export const initialState: State = {
  currentFlyout: null,
  payload: null,
};

interface IAddExceptionPayload {
  exceptionFlyoutType: ExceptionListType;
  addExceptionModalWrapperData: AddExceptionModalWrapperData;
  onAddExceptionCancel: () => void;
  onAddExceptionConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
  ruleIndices: string[];
}

interface IOsqueryPayload {
  agentId: string;
  onClose: () => void;
}

interface IEvenFilterPayload {
  ecsData: Ecs;
  closeAddEventFilterModal: () => void;
}

export type Action =
  | { type: null }
  | {
      type: FlyoutTypes.OSQUERY;
      payload: IOsqueryPayload;
    }
  | {
      type: FlyoutTypes.EVENT_FILTER;
      payload: IEvenFilterPayload;
    }
  | {
      type: FlyoutTypes.ADD_EXCEPTION;
      payload: IAddExceptionPayload;
    };

export enum FlyoutTypes {
  OSQUERY = 'osquery',
  EVENT_FILTER = 'event_filter',
  ADD_EXCEPTION = 'add_exception',
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
    case FlyoutTypes.ADD_EXCEPTION: {
      return {
        ...state,
        currentFlyout: FlyoutTypes.ADD_EXCEPTION,
        payload: action.payload,
      };
    }
    default:
      return {
        currentFlyout: null,
        payload: null,
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
        const { ecsData, closeAddEventFilterModal, ...rest } = data.payload as IEvenFilterPayload;

        return <EventFiltersFlyout data={ecsData} onCancel={closeAddEventFilterModal} {...rest} />;
      case FlyoutTypes.ADD_EXCEPTION:
        const {
          ruleIndices,
          exceptionFlyoutType,
          onAddExceptionCancel,
          onAddExceptionConfirm,
          addExceptionModalWrapperData,
        } = data.payload as IAddExceptionPayload;

        return (
          <AddExceptionFlyoutWrapper
            alertStatus={addExceptionModalWrapperData.alertStatus}
            onRuleChange={addExceptionModalWrapperData.onRuleChange}
            eventId={addExceptionModalWrapperData.eventId}
            ruleId={addExceptionModalWrapperData.ruleId as string}
            ruleName={addExceptionModalWrapperData.ruleName as string}
            ruleIndices={ruleIndices}
            exceptionListType={exceptionFlyoutType}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
          />
        );

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
