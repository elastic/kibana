/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reducer } from 'react';
import React, { useCallback, useMemo, useState, useReducer } from 'react';
import { useDispatch } from 'react-redux';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import styled from 'styled-components';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { useKibana } from '../../lib/kibana';
import { useLensAttributes } from './use_lens_attributes';
import type { LensEmbeddableComponentProps } from './types';
import { useActions } from './use_actions';
import { inputsSelectors } from '../../store';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { ModalInspectQuery } from '../inspect/modal';
import { InputsModelId } from '../../store/inputs/constants';
import { getRequestsAndResponses } from './utils';

const LensComponentWrapper = styled.div<{ height?: string }>`
  height: ${({ height }) => height ?? 'auto'};
  > div {
    background-color: transparent;
  }
  .expExpressionRenderer__expression {
    padding: 0 !important;
  }
  .legacyMtrVis__container {
    padding: 0;
  }
`;

type Responses = string[] | undefined;
type Requests = string[] | undefined;

interface Action {
  type: 'setData';
  responses: string[] | undefined;
  requests: string[] | undefined;
  isLoading: boolean;
}

interface State {
  responses: Responses;
  requests: Requests;
  isLoading: boolean;
}

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'setData':
      return {
        ...state,
        responses: action.responses,
        requests: action.requests,
        isLoading: action.isLoading,
      };
    default:
      return state;
  }
};

const initialState = {
  requests: undefined,
  responses: undefined,
  isLoading: true,
  stats: undefined,
};

const style = { height: '100%', minWidth: '100px' };

const LensEmbeddableComponent: React.FC<LensEmbeddableComponentProps> = ({
  getLensAttributes,
  height,
  id,
  inputsModelId = InputsModelId.global,
  lensAttributes,
  stackByField,
  timerange,
  inspectTitle,
}) => {
  const { lens } = useKibana().services;
  const dispatch = useDispatch();
  const [isShowingModal, setIsShowingModal] = useState(false);
  const [visData, dispatchData] = useReducer<Reducer<State, Action>>(reducer, initialState);

  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { searchSessionId } = useDeepEqualSelector((state) => getGlobalQuery(state, id));
  const attributes = useLensAttributes({
    lensAttributes,
    getLensAttributes,
    stackByField,
    title: '',
  });

  const LensComponent = lens.EmbeddableComponent;
  const inspectActionProps = useMemo(
    () => ({
      onInspectActionClicked: () => {
        setIsShowingModal(true);
      },
      isDisabled: visData.isLoading,
    }),
    [visData.isLoading]
  );
  const actions = useActions({
    withActions: true,
    attributes,
    timeRange: timerange,
    inspectActionProps,
  });

  const handleCloseModal = useCallback(() => {
    setIsShowingModal(false);
  }, []);

  const updateDateRange = useCallback(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      dispatch(
        setAbsoluteRangeDatePicker({
          id: inputsModelId,
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        })
      );
    },
    [dispatch, inputsModelId]
  );

  const [request, ...additionalRequests] = visData.requests ?? [];
  const [response, ...additionalResponses] = visData.responses ?? [];

  const onLoad = useCallback((isLoading, adapters) => {
    if (!adapters) {
      return;
    }
    const data = getRequestsAndResponses(adapters?.requests?.getRequests());
    dispatchData({
      type: 'setData',
      requests: data.requests,
      responses: data.responses,
      isLoading,
    });
  }, []);

  return (
    <>
      {attributes && searchSessionId ? (
        <LensComponentWrapper height={height}>
          <LensComponent
            id={id}
            style={style}
            timeRange={timerange}
            attributes={attributes}
            onLoad={onLoad}
            onBrushEnd={updateDateRange}
            viewMode={ViewMode.VIEW}
            withDefaultActions={false}
            extraActions={actions}
            searchSessionId={searchSessionId}
            showInspector={false}
          />
        </LensComponentWrapper>
      ) : null}
      {isShowingModal && request !== null && response !== null && (
        <ModalInspectQuery
          additionalRequests={additionalRequests}
          additionalResponses={additionalResponses}
          closeModal={handleCloseModal}
          data-test-subj="inspect-modal"
          inputId={inputsModelId}
          request={request}
          response={response}
          title={inspectTitle}
        />
      )}
    </>
  );
};

export const LensEmbeddable = React.memo(LensEmbeddableComponent);
