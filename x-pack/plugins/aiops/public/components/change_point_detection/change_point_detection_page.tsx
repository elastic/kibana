/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Query } from '@kbn/es-query';
import { ChartsGrid } from './charts_grid';
import { FieldsConfig } from './fields_config';
import { useDataSource } from '../../hooks/use_data_source';
import { ChangePointTypeFilter } from './change_point_type_filter';
import { SearchBarWrapper } from './search_bar';
import { useChangePointDetectionContext } from './change_point_detection_context';
import { type ChangePointType } from './constants';

export const ChangePointDetectionPage: FC = () => {
  const [isFlyoutVisible, setFlyoutVisible] = useState<boolean>(false);

  const {
    requestParams,
    updateRequestParams,
    resultFilters,
    updateFilters,
    resultQuery,
    metricFieldOptions,
    selectedChangePoints,
  } = useChangePointDetectionContext();

  const { dataView } = useDataSource();

  const setQuery = useCallback(
    (query: Query) => {
      updateRequestParams({ query });
    },
    [updateRequestParams]
  );

  const setChangePointType = useCallback(
    (changePointType: ChangePointType[] | undefined) => {
      updateRequestParams({ changePointType });
    },
    [updateRequestParams]
  );

  if (metricFieldOptions.length === 0) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.aiops.index.dataViewWithoutMetricNotificationTitle', {
          defaultMessage: 'The data view "{dataViewTitle}" does not contain any metric fields.',
          values: { dataViewTitle: dataView.getName() },
        })}
        color="danger"
        iconType="warning"
      >
        <p>
          {i18n.translate('xpack.aiops.index.dataViewWithoutMetricNotificationDescription', {
            defaultMessage:
              'Change point detection can only be run on data views with a metric field.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  const hasSelectedChangePoints = Object.values(selectedChangePoints).some((v) => v.length > 0);

  return (
    <div data-test-subj="aiopsChangePointDetectionPage">
      <SearchBarWrapper
        query={resultQuery}
        onQueryChange={setQuery}
        filters={resultFilters}
        onFiltersChange={updateFilters}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems={'center'}>
            <EuiFlexItem grow={false}>
              <EuiText size={'s'}>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.aggregationIntervalTitle"
                  defaultMessage="Aggregation interval: "
                />
                {requestParams.interval}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={
                  hasSelectedChangePoints ? (
                    ''
                  ) : (
                    <FormattedMessage
                      id="xpack.aiops.changePointDetection.viewSelectedChartsToltip"
                      defaultMessage="Select change points to view them in detail."
                    />
                  )
                }
              >
                <EuiButtonEmpty
                  onClick={() => setFlyoutVisible(!isFlyoutVisible)}
                  size={'s'}
                  disabled={!hasSelectedChangePoints}
                  data-test-subj={'aiopsChangePointDetectionViewSelected'}
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage="View selected"
                  />
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: '400px' }}>
          <ChangePointTypeFilter
            value={requestParams.changePointType}
            onChange={setChangePointType}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <FieldsConfig />

      {isFlyoutVisible ? (
        <EuiFlyout
          ownFocus
          onClose={setFlyoutVisible.bind(null, false)}
          aria-labelledby={'change_point_charts'}
          size={'l'}
          data-test-subj={'aiopsChangePointDetectionSelectedCharts'}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={'change_point_charts'}>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.selectedChangePointsHeader"
                  defaultMessage="Selected change points"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ChartsGrid changePoints={selectedChangePoints} />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </div>
  );
};
