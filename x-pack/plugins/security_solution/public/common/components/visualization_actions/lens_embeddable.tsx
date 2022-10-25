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
import { getOr } from 'lodash/fp';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { useKibana } from '../../lib/kibana';
import { useLensAttributes } from './use_lens_attributes';
import type { LensEmbeddableComponentProps, Request } from './types';
import { useActions } from './use_actions';
import { inputsSelectors } from '../../store';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { ModalInspectQuery } from '../inspect/modal';
import { InputsModelId } from '../../store/inputs/constants';

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

interface State {
  responses: Responses;
  requests: Requests;
  isLoading: boolean;
}

export interface Action {
  type: 'setData';
  responses: Responses;
  requests: Requests;
  isLoading: boolean;
}

function reducer(state: State, action: Action) {
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
}

const initialState = {
  requests: undefined,
  responses: undefined,
  isLoading: true,
  stats: undefined,
};

const LensEmbeddableComponent: React.FC<LensEmbeddableComponentProps> = ({
  getLensAttributes,
  height,
  id,
  inputsModelId = InputsModelId.global,
  lensAttributes,
  metricAlignment,
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

  const [request, ...additionalRequests] = visData.requests ?? [];
  const [response, ...additionalResponses] = visData.responses ?? [];

  const onLoad = useCallback((isLoading, adapters) => {
    const data = adapters?.requests?.getRequests().reduce(
      (acc: { requests: string[]; responses: string[] }, d: Request) => {
        return {
          requests: [
            ...acc.requests,
            JSON.stringify(
              { body: d?.json, index: getOr('', 'stats.indexFilter.value', d).split(',') },
              null,
              2
            ),
          ],
          responses: [
            ...acc.responses,
            JSON.stringify(getOr({}, 'response.json.rawResponse', d), null, 2),
          ],
        };
      },
      { requests: [], responses: [] }
    );
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
            style={{ height: '100%' }}
            timeRange={timerange}
            attributes={attributes}
            onLoad={onLoad}
            onBrushEnd={onBrushEnd}
            viewMode={ViewMode.VIEW}
            withDefaultActions={false}
            extraActions={actions}
            searchSessionId={searchSessionId}
            showInspector={false}
            metricAlignment={metricAlignment}
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
