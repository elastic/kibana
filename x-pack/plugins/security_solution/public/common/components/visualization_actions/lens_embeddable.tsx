/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedMessage } from '@kbn/i18n-react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import styled from 'styled-components';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
import { SourcererScopeName } from '../../store/sourcerer/model';
import { VisualizationActions } from './actions';

const LensComponentWrapper = styled.div<{ height?: string; width?: string }>`
  height: ${({ height }) => height ?? 'auto'};
  width: ${({ width }) => width ?? 'auto'};
  > div {
    background-color: transparent;
  }
  .expExpressionRenderer__expression {
    padding: 2px 0 0 0 !important;
  }
  .legacyMtrVis__container {
    padding: 0;
  }
`;

const initVisualizationData: {
  requests: string[] | undefined;
  responses: string[] | undefined;
  isLoading: boolean;
} = {
  requests: undefined,
  responses: undefined,
  isLoading: true,
};

const LensEmbeddableComponent: React.FC<LensEmbeddableComponentProps> = ({
  applyGlobalQueriesAndFilters = true,
  extraActions,
  extraOptions,
  getLensAttributes,
  height: wrapperHeight,
  id,
  inputsModelId = InputsModelId.global,
  inspectTitle,
  lensAttributes,
  onLoad,
  scopeId = SourcererScopeName.default,
  stackByField,
  timerange,
  width: wrapperWidth,
  withActions = true,
}) => {
  const style = useMemo(
    () => ({
      height: wrapperHeight ?? '100%',
      minWidth: '100px',
      width: wrapperWidth ?? '100%',
    }),
    [wrapperHeight, wrapperWidth]
  );
  const { lens } = useKibana().services;
  const dispatch = useDispatch();
  const [isShowingModal, setIsShowingModal] = useState(false);
  const [visualizationData, setVisualizationData] = useState(initVisualizationData);
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { searchSessionId } = useDeepEqualSelector((state) => getGlobalQuery(state, id));
  const attributes = useLensAttributes({
    applyGlobalQueriesAndFilters,
    extraOptions,
    getLensAttributes,
    lensAttributes,
    scopeId,
    stackByField,
    title: '',
  });
  const LensComponent = lens.EmbeddableComponent;
  const inspectActionProps = useMemo(
    () => ({
      onInspectActionClicked: () => {
        setIsShowingModal(true);
      },
      isDisabled: visualizationData.isLoading,
    }),
    [visualizationData.isLoading]
  );

  const actions = useActions({
    attributes,
    extraActions,
    inspectActionProps,
    timeRange: timerange,
    withActions,
  });

  const handleCloseModal = useCallback(() => {
    setIsShowingModal(false);
  }, []);

  const updateDateRange = useCallback(
    ({ range }) => {
      const [min, max] = range;
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

  const requests = useMemo(() => {
    const [request, ...additionalRequests] = visualizationData.requests ?? [];
    return { request, additionalRequests };
  }, [visualizationData.requests]);

  const responses = useMemo(() => {
    const [response, ...additionalResponses] = visualizationData.responses ?? [];
    return { response, additionalResponses };
  }, [visualizationData.responses]);

  const callback = useCallback(
    (isLoading, adapters) => {
      if (!adapters) {
        return;
      }
      const data = getRequestsAndResponses(adapters?.requests?.getRequests());
      setVisualizationData({
        requests: data.requests,
        responses: data.responses,
        isLoading,
      });

      if (onLoad != null) {
        onLoad({
          requests: data.requests,
          responses: data.responses,
          isLoading,
        });
      }
    },
    [onLoad]
  );

  const adHocDataViews = useMemo(
    () =>
      attributes?.state?.adHocDataViews != null
        ? Object.values(attributes?.state?.adHocDataViews).reduce((acc, adHocDataView) => {
            if (adHocDataView?.name != null) {
              acc.push(adHocDataView?.name);
            }
            return acc;
          }, [] as string[])
        : null,
    [attributes?.state?.adHocDataViews]
  );

  if (!searchSessionId) {
    return null;
  }

  if (
    !attributes ||
    (visualizationData?.responses != null && visualizationData?.responses?.length === 0)
  ) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiEmptyPrompt
            body={
              <FormattedMessage
                id="xpack.securitySolution.lensEmbeddable.NoDataToDisplay.title"
                defaultMessage="No data to display"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <VisualizationActions
            extraActions={extraActions}
            getLensAttributes={getLensAttributes}
            inputId={inputsModelId}
            isInspectButtonDisabled={true}
            lensAttributes={attributes}
            queryId={id}
            stackByField={stackByField}
            timerange={timerange}
            title={inspectTitle}
            withDefaultActions={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {attributes && searchSessionId && (
        <LensComponentWrapper height={wrapperHeight} width={wrapperWidth}>
          <LensComponent
            id={id}
            style={style}
            timeRange={timerange}
            attributes={attributes}
            onLoad={callback}
            onBrushEnd={updateDateRange}
            viewMode={ViewMode.VIEW}
            withDefaultActions={false}
            extraActions={actions}
            searchSessionId={searchSessionId}
            showInspector={false}
          />
        </LensComponentWrapper>
      )}
      {isShowingModal && requests.request != null && responses.response != null && (
        <ModalInspectQuery
          adHocDataViews={adHocDataViews}
          additionalRequests={requests.additionalRequests}
          additionalResponses={responses.additionalResponses}
          closeModal={handleCloseModal}
          data-test-subj="inspect-modal"
          inputId={inputsModelId}
          request={requests.request}
          response={responses.response}
          title={inspectTitle}
        />
      )}
    </>
  );
};

export const LensEmbeddable = React.memo(LensEmbeddableComponent);
