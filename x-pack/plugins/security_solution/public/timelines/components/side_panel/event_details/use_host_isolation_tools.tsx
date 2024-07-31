/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';

import { useWithCaseDetailsRefresh } from '../../../../common/components/endpoint/host_isolation/from_cases/endpoint_host_isolation_cases_context';

interface HostIsolationStateReducer {
  isolateAction: 'isolateHost' | 'unisolateHost';
  isHostIsolationPanelOpen: boolean;
  isIsolateActionSuccessBannerVisible: boolean;
}

type HostIsolationActions =
  | {
      type: 'setIsHostIsolationPanel';
      isHostIsolationPanelOpen: boolean;
    }
  | {
      type: 'setIsolateAction';
      isolateAction: 'isolateHost' | 'unisolateHost';
    }
  | {
      type: 'setIsIsolateActionSuccessBannerVisible';
      isIsolateActionSuccessBannerVisible: boolean;
    };

const initialHostIsolationState: HostIsolationStateReducer = {
  isolateAction: 'isolateHost',
  isHostIsolationPanelOpen: false,
  isIsolateActionSuccessBannerVisible: false,
};

function hostIsolationReducer(state: HostIsolationStateReducer, action: HostIsolationActions) {
  switch (action.type) {
    case 'setIsolateAction':
      return { ...state, isolateAction: action.isolateAction };
    case 'setIsHostIsolationPanel':
      return { ...state, isHostIsolationPanelOpen: action.isHostIsolationPanelOpen };
    case 'setIsIsolateActionSuccessBannerVisible':
      return {
        ...state,
        isIsolateActionSuccessBannerVisible: action.isIsolateActionSuccessBannerVisible,
      };
    default:
      throw new Error();
  }
}

// TODO: MOVE TO FLYOUT FOLDER - https://github.com/elastic/security-team/issues/7462
const useHostIsolationTools = () => {
  const [
    { isolateAction, isHostIsolationPanelOpen, isIsolateActionSuccessBannerVisible },
    dispatch,
  ] = useReducer(hostIsolationReducer, initialHostIsolationState);

  const showAlertDetails = useCallback(() => {
    dispatch({ type: 'setIsHostIsolationPanel', isHostIsolationPanelOpen: false });
    dispatch({
      type: 'setIsIsolateActionSuccessBannerVisible',
      isIsolateActionSuccessBannerVisible: false,
    });
  }, []);

  const showHostIsolationPanel = useCallback((action) => {
    if (action === 'isolateHost' || action === 'unisolateHost') {
      dispatch({ type: 'setIsHostIsolationPanel', isHostIsolationPanelOpen: true });
      dispatch({ type: 'setIsolateAction', isolateAction: action });
    }
  }, []);

  const caseDetailsRefresh = useWithCaseDetailsRefresh();

  const handleIsolationActionSuccess = useCallback(() => {
    dispatch({
      type: 'setIsIsolateActionSuccessBannerVisible',
      isIsolateActionSuccessBannerVisible: true,
    });
    // If a case details refresh ref is defined, then refresh actions and comments
    if (caseDetailsRefresh) {
      caseDetailsRefresh.refreshCase();
    }
  }, [caseDetailsRefresh]);

  return useMemo(
    () => ({
      isolateAction,
      isHostIsolationPanelOpen,
      isIsolateActionSuccessBannerVisible,
      handleIsolationActionSuccess,
      showAlertDetails,
      showHostIsolationPanel,
    }),
    [
      isHostIsolationPanelOpen,
      isIsolateActionSuccessBannerVisible,
      isolateAction,
      handleIsolationActionSuccess,
      showAlertDetails,
      showHostIsolationPanel,
    ]
  );
};

export { useHostIsolationTools };
