/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import {
  UxLocalUIFilterName,
  uxLocalUIFilterNames,
} from '../../../../../common/ux_ui_filter';
import {
  VisitorBreakdownChart,
  VisitorBreakdownMetric,
} from '../charts/visitor_breakdown_chart';
import { I18LABELS, VisitorBreakdownLabel } from '../translations';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useLocalUIFilters } from '../hooks/use_local_uifilters';
import { getExcludedName } from '../local_uifilters';
import { useDataView } from '../local_uifilters/use_data_view';

type VisitorBreakdownFieldMap = Record<
  VisitorBreakdownMetric,
  UxLocalUIFilterName
>;

const visitorBreakdownFieldMap: VisitorBreakdownFieldMap = {
  [VisitorBreakdownMetric.OS_BREAKDOWN]: 'os',
  [VisitorBreakdownMetric.UA_BREAKDOWN]: 'browser',
};

const EuiLoadingEmbeddable = styled(EuiFlexGroup)`
  & {
    min-height: 100%;
    min-width: 100%;
  }
`;

const vistorBreakdownFilter = {
  filterNames: uxLocalUIFilterNames.filter((name) =>
    ['browser', 'browserExcluded', 'os', 'osExcluded'].includes(name)
  ),
};

const getInvertedFilterName = (filter: UxLocalUIFilterName, negate: boolean) =>
  negate ? filter : getExcludedName(filter);

export function VisitorBreakdown() {
  const { urlParams, uxUiFilters } = useLegacyUrlParams();
  const { start, end, searchTerm } = urlParams;
  const { dataView } = useDataView();

  const { filters, setFilterValue } = useLocalUIFilters(vistorBreakdownFilter);

  const onFilter = useCallback(
    (metric: VisitorBreakdownMetric, event: any) => {
      if (!visitorBreakdownFieldMap[metric]) {
        return;
      }

      const filterValues = event?.data?.map((fdata: any) => fdata.value);
      const invertedField = getInvertedFilterName(
        visitorBreakdownFieldMap[metric],
        event?.negate ?? false
      );
      const invertedFieldValues =
        filters?.find((filter) => filter.name === invertedField)?.value ?? [];

      setFilterValue(
        invertedField,
        invertedFieldValues.filter((value) => !filterValues.includes(value))
      );

      setFilterValue(
        event?.negate
          ? getExcludedName(visitorBreakdownFieldMap[metric])
          : visitorBreakdownFieldMap[metric],
        filterValues
      );
    },
    [filters, setFilterValue]
  );

  return (
    <>
      <EuiTitle size="s">
        <h3>{VisitorBreakdownLabel}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup style={{ height: 'calc(100% - 32px)' }}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{I18LABELS.browser}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {!dataView?.id ? (
            <EuiLoadingEmbeddable
              justifyContent="spaceAround"
              alignItems={'center'}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingChart size="l" mono />
              </EuiFlexItem>
            </EuiLoadingEmbeddable>
          ) : (
            <VisitorBreakdownChart
              dataView={dataView}
              start={start ?? ''}
              end={end ?? ''}
              uiFilters={uxUiFilters}
              urlQuery={searchTerm}
              metric={VisitorBreakdownMetric.UA_BREAKDOWN}
              onFilter={onFilter}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{I18LABELS.operatingSystem}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {!dataView?.id ? (
            <EuiLoadingEmbeddable
              justifyContent="spaceAround"
              alignItems={'center'}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingChart size="l" mono />
              </EuiFlexItem>
            </EuiLoadingEmbeddable>
          ) : (
            <VisitorBreakdownChart
              dataView={dataView}
              start={start ?? ''}
              end={end ?? ''}
              uiFilters={uxUiFilters}
              urlQuery={searchTerm}
              metric={VisitorBreakdownMetric.OS_BREAKDOWN}
              onFilter={onFilter}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
