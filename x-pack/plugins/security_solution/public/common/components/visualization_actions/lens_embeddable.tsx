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
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { RangeFilterParams } from '@kbn/es-query';
import type { ClickTriggerEvent, MultiClickTriggerEvent } from '@kbn/charts-plugin/public';
import type { EmbeddableComponentProps, XYState } from '@kbn/lens-plugin/public';
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

const HOVER_ACTIONS_PADDING = 24;

const LensComponentWrapper = styled.div<{
  $height?: number;
  width?: string | number;
  $addHoverActionsPadding?: boolean;
}>`
  height: ${({ $height }) => ($height ? `${$height}px` : 'auto')};
  width: ${({ width }) => width ?? 'auto'};

  ${({ $addHoverActionsPadding }) =>
    $addHoverActionsPadding ? `.embPanel__header { top: ${HOVER_ACTIONS_PADDING * -1}px; }` : ''}

  .embPanel__header {
    z-index: 2;
    position: absolute;
    right: 0;
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
  disableOnClickFilter = false,
}) => {
  const style = useMemo(
    () => ({
      height: wrapperHeight ?? '100%',
      minWidth: '100px',
      width: wrapperWidth ?? '100%',
    }),
    [wrapperHeight, wrapperWidth]
  );
  const {
    lens,
    data: {
      actions: { createFiltersFromValueClickAction },
    },
  } = useKibana().services;
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
  const preferredSeriesType = (attributes?.state?.visualization as XYState)?.preferredSeriesType;
  // Avoid hover actions button overlaps with its chart
  const addHoverActionsPadding =
    attributes?.visualizationType !== 'lnsLegacyMetric' &&
    attributes?.visualizationType !== 'lnsPie';
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

  const onLoadCallback = useCallback(
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

  const onFilterCallback = useCallback(() => {
    const callback: EmbeddableComponentProps['onFilter'] = async (e) => {
      if (!isClickTriggerEvent(e) || preferredSeriesType !== 'area' || disableOnClickFilter) {
        e.preventDefault();
        return;
      }
      // Update timerange when clicking on a dot in an area chart
      const [{ query }] = await createFiltersFromValueClickAction({
        data: e.data,
        negate: e.negate,
      });
      const rangeFilter: RangeFilterParams = query?.range['@timestamp'];
      if (rangeFilter?.gte && rangeFilter?.lt) {
        updateDateRange({
          range: [rangeFilter.gte, rangeFilter.lt],
        });
      }
    };
    return callback;
  }, [
    createFiltersFromValueClickAction,
    updateDateRange,
    preferredSeriesType,
    disableOnClickFilter,
  ]);

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
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.securitySolution.lensEmbeddable.NoDataToDisplay.title"
                  defaultMessage="No data to display"
                />
              </EuiText>
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
        <LensComponentWrapper
          $height={wrapperHeight}
          width={wrapperWidth}
          $addHoverActionsPadding={addHoverActionsPadding}
        >
          <LensComponent
            id={id}
            style={style}
            timeRange={timerange}
            attributes={attributes}
            onLoad={onLoadCallback}
            onBrushEnd={updateDateRange}
            onFilter={onFilterCallback}
            viewMode={ViewMode.VIEW}
            withDefaultActions={false}
            extraActions={actions}
            searchSessionId={searchSessionId}
            showInspector={false}
            syncTooltips={false}
            syncCursor={false}
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

const isClickTriggerEvent = (
  e: ClickTriggerEvent['data'] | MultiClickTriggerEvent['data']
): e is ClickTriggerEvent['data'] => {
  return Array.isArray(e.data) && 'column' in e.data[0];
};

export const LensEmbeddable = React.memo(LensEmbeddableComponent);
