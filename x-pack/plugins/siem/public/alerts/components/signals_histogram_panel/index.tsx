/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Position } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';
import uuid from 'uuid';

import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import { LegendItem } from '../../../../components/charts/draggable_legend_item';
import { escapeDataProviderId } from '../../../../components/drag_and_drop/helpers';
import { HeaderSection } from '../../../../components/header_section';
import { Filter, esQuery, Query } from '../../../../../../../../src/plugins/data/public';
import { useQuerySignals } from '../../../../containers/detection_engine/signals/use_query';
import { getDetectionEngineUrl } from '../../../../components/link_to';
import { defaultLegendColors } from '../../../../components/matrix_histogram/utils';
import { InspectButtonContainer } from '../../../../components/inspect';
import { useGetUrlSearch } from '../../../../components/navigation/use_get_url_search';
import { MatrixLoader } from '../../../../components/matrix_histogram/matrix_loader';
import { MatrixHistogramOption } from '../../../../components/matrix_histogram/types';
import { useKibana, useUiSetting$ } from '../../../../lib/kibana';
import { navTabs } from '../../../home/home_navigations';
import { signalsHistogramOptions } from './config';
import { formatSignalsData, getSignalsHistogramQuery, showInitialLoadingSpinner } from './helpers';
import { SignalsHistogram } from './signals_histogram';
import * as i18n from './translations';
import { RegisterQuery, SignalsHistogramOption, SignalsAggregation, SignalsTotal } from './types';

const DEFAULT_PANEL_HEIGHT = 300;

const StyledEuiPanel = styled(EuiPanel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `height: ${height}px;` : '')}
  position: relative;
`;

const defaultTotalSignalsObj: SignalsTotal = {
  value: 0,
  relation: 'eq',
};

export const DETECTIONS_HISTOGRAM_ID = 'detections-histogram';

const ViewSignalsFlexItem = styled(EuiFlexItem)`
  margin-left: 24px;
`;

interface SignalsHistogramPanelProps {
  chartHeight?: number;
  defaultStackByOption?: SignalsHistogramOption;
  deleteQuery?: ({ id }: { id: string }) => void;
  filters?: Filter[];
  from: number;
  headerChildren?: React.ReactNode;
  /** Override all defaults, and only display this field */
  onlyField?: string;
  query?: Query;
  legendPosition?: Position;
  panelHeight?: number;
  signalIndexName: string | null;
  setQuery: (params: RegisterQuery) => void;
  showLinkToSignals?: boolean;
  showTotalSignalsCount?: boolean;
  stackByOptions?: SignalsHistogramOption[];
  title?: string;
  to: number;
  updateDateRange: (min: number, max: number) => void;
}

const getHistogramOption = (fieldName: string): MatrixHistogramOption => ({
  text: fieldName,
  value: fieldName,
});

const NO_LEGEND_DATA: LegendItem[] = [];

export const SignalsHistogramPanel = memo<SignalsHistogramPanelProps>(
  ({
    chartHeight,
    defaultStackByOption = signalsHistogramOptions[0],
    deleteQuery,
    filters,
    headerChildren,
    onlyField,
    query,
    from,
    legendPosition = 'right',
    panelHeight = DEFAULT_PANEL_HEIGHT,
    setQuery,
    signalIndexName,
    showLinkToSignals = false,
    showTotalSignalsCount = false,
    stackByOptions,
    to,
    title = i18n.HISTOGRAM_HEADER,
    updateDateRange,
  }) => {
    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_HISTOGRAM_ID}-${uuid.v4()}`, []);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const [totalSignalsObj, setTotalSignalsObj] = useState<SignalsTotal>(defaultTotalSignalsObj);
    const [selectedStackByOption, setSelectedStackByOption] = useState<SignalsHistogramOption>(
      onlyField == null ? defaultStackByOption : getHistogramOption(onlyField)
    );
    const {
      loading: isLoadingSignals,
      data: signalsData,
      setQuery: setSignalsQuery,
      response,
      request,
      refetch,
    } = useQuerySignals<{}, SignalsAggregation>(
      getSignalsHistogramQuery(selectedStackByOption.value, from, to, []),
      signalIndexName
    );
    const kibana = useKibana();
    const urlSearch = useGetUrlSearch(navTabs.detections);

    const totalSignals = useMemo(
      () =>
        i18n.SHOWING_SIGNALS(
          numeral(totalSignalsObj.value).format(defaultNumberFormat),
          totalSignalsObj.value,
          totalSignalsObj.relation === 'gte' ? '>' : totalSignalsObj.relation === 'lte' ? '<' : ''
        ),
      [totalSignalsObj]
    );

    const setSelectedOptionCallback = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions?.find(co => co.value === event.target.value) ?? defaultStackByOption
      );
    }, []);

    const formattedSignalsData = useMemo(() => formatSignalsData(signalsData), [signalsData]);

    const legendItems: LegendItem[] = useMemo(
      () =>
        signalsData?.aggregations?.signalsByGrouping?.buckets != null
          ? signalsData.aggregations.signalsByGrouping.buckets.map((bucket, i) => ({
              color: i < defaultLegendColors.length ? defaultLegendColors[i] : undefined,
              dataProviderId: escapeDataProviderId(
                `draggable-legend-item-${uuid.v4()}-${selectedStackByOption.value}-${bucket.key}`
              ),
              field: selectedStackByOption.value,
              value: bucket.key,
            }))
          : NO_LEGEND_DATA,
      [signalsData, selectedStackByOption.value]
    );

    useEffect(() => {
      let canceled = false;

      if (!canceled && !showInitialLoadingSpinner({ isInitialLoading, isLoadingSignals })) {
        setIsInitialLoading(false);
      }

      return () => {
        canceled = true; // prevent long running data fetches from updating state after unmounting
      };
    }, [isInitialLoading, isLoadingSignals, setIsInitialLoading]);

    useEffect(() => {
      return () => {
        if (deleteQuery) {
          deleteQuery({ id: uniqueQueryId });
        }
      };
    }, []);

    useEffect(() => {
      if (refetch != null && setQuery != null) {
        setQuery({
          id: uniqueQueryId,
          inspect: {
            dsl: [request],
            response: [response],
          },
          loading: isLoadingSignals,
          refetch,
        });
      }
    }, [setQuery, isLoadingSignals, signalsData, response, request, refetch]);

    useEffect(() => {
      setTotalSignalsObj(
        signalsData?.hits.total ?? {
          value: 0,
          relation: 'eq',
        }
      );
    }, [signalsData]);

    useEffect(() => {
      const converted = esQuery.buildEsQuery(
        undefined,
        query != null ? [query] : [],
        filters?.filter(f => f.meta.disabled === false) ?? [],
        {
          ...esQuery.getEsQueryConfig(kibana.services.uiSettings),
          dateFormatTZ: undefined,
        }
      );

      setSignalsQuery(
        getSignalsHistogramQuery(
          selectedStackByOption.value,
          from,
          to,
          !isEmpty(converted) ? [converted] : []
        )
      );
    }, [selectedStackByOption.value, from, to, query, filters]);

    const linkButton = useMemo(() => {
      if (showLinkToSignals) {
        return (
          <ViewSignalsFlexItem grow={false}>
            <EuiButton href={getDetectionEngineUrl(urlSearch)}>{i18n.VIEW_SIGNALS}</EuiButton>
          </ViewSignalsFlexItem>
        );
      }
    }, [showLinkToSignals, urlSearch]);

    const titleText = useMemo(() => (onlyField == null ? title : i18n.TOP(onlyField)), [
      onlyField,
      title,
    ]);

    return (
      <InspectButtonContainer data-test-subj="signals-histogram-panel" show={!isInitialLoading}>
        <StyledEuiPanel height={panelHeight}>
          <HeaderSection
            id={uniqueQueryId}
            title={titleText}
            titleSize={onlyField == null ? 'm' : 's'}
            subtitle={!isInitialLoading && showTotalSignalsCount && totalSignals}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {stackByOptions && (
                  <EuiSelect
                    onChange={setSelectedOptionCallback}
                    options={stackByOptions}
                    prepend={i18n.STACK_BY_LABEL}
                    value={selectedStackByOption.value}
                  />
                )}
                {headerChildren != null && headerChildren}
              </EuiFlexItem>
              {linkButton}
            </EuiFlexGroup>
          </HeaderSection>

          {isInitialLoading ? (
            <MatrixLoader />
          ) : (
            <SignalsHistogram
              chartHeight={chartHeight}
              data={formattedSignalsData}
              from={from}
              legendItems={legendItems}
              legendPosition={legendPosition}
              loading={isLoadingSignals}
              to={to}
              updateDateRange={updateDateRange}
            />
          )}
        </StyledEuiPanel>
      </InspectButtonContainer>
    );
  }
);

SignalsHistogramPanel.displayName = 'SignalsHistogramPanel';
