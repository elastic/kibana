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

type Responses = string[] | undefined; // todo
type Requests = string[] | undefined; // todo
type Stats = Array<{}> | undefined; // todo

interface State {
  responses: Responses;
  requests: Requests;
  stats: Stats;
  isLoading: boolean | undefined;
}

export type Action =
  | { type: 'setData'; responses: Responses; requests: Requests }
  | { type: 'setLoading'; isLoading: boolean };

function reducer(state: State, action: Action) {
  switch (action.type) {
    case 'setData':
      return {
        ...state,
        responses: action.responses,
        requests: action.requests,
      };
    case 'setLoading':
      return { ...state, loading: action.isLoading };
  }
}

const initialState = {
  requests: undefined,
  responses: undefined,
  isLoading: undefined,
  stats: undefined,
};

const LensEmbeddableComponent: React.FC<LensEmbeddableComponentProps> = ({
  getLensAttributes,
  height,
  id,
  inputsModelId = 'global',
  lensAttributes,
  stackByField,
  timerange,
  inspectTitle,
}) => {
  const { lens } = useKibana().services;
  const dispatch = useDispatch();
  const [isShowingModal, setIsShowingModal] = useState(false);
  const [state, dispatchData] = useReducer<Reducer<State, Action>>(reducer, initialState);

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
      isDisabled: state.isLoading,
    }),
    [state.isLoading]
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

  const onBrushEnd = useCallback(
    ({ range }: { range: number[] }) => {
      dispatch(
        setAbsoluteRangeDatePicker({
          id: inputsModelId,
          from: new Date(range[0]).toISOString(),
          to: new Date(range[1]).toISOString(),
        })
      );
    },
    [dispatch, inputsModelId]
  );

  const [request, ...additionalRequests] = state.requests ?? [];
  const [response, ...additionalResponses] = state.responses ?? [];

  return (
    <>
      {attributes && searchSessionId ? (
        <LensComponentWrapper height={height}>
          <LensComponent
            id={id}
            style={{ height: '100%' }}
            timeRange={timerange}
            attributes={attributes}
            onLoad={(isLoading, adapters) => {
              dispatchData({ type: 'setLoading', isLoading });

              const data = Array.from(adapters?.requests?.requests ?? []).map((data) => {
                const d = data[1];
                return {
                  request: JSON.stringify(
                    { body: d?.json, index: d.stats.indexFilter.value.split(',') },
                    null,
                    2
                  ),
                  response: JSON.stringify(d?.response?.json.rawResponse, null, 2),
                };
              });
              dispatchData({
                type: 'setData',
                requests: data?.map((d) => d.request) ?? [],
                responses: data?.map((d) => d.response) ?? [],
              });
            }}
            onBrushEnd={onBrushEnd}
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
