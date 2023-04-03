/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Query } from '@kbn/es-query';
import { FieldsConfig } from './fields_config';
import { useDataSource } from '../../hooks/use_data_source';
import { ChangePointTypeFilter } from './change_point_type_filter';
import { SearchBarWrapper } from './search_bar';
import { ChangePointType, useChangePointDetectionContext } from './change_point_detection_context';

export const ChangePointDetectionPage: FC = () => {
  const {
    requestParams,
    updateRequestParams,
    resultFilters,
    updateFilters,
    resultQuery,
    metricFieldOptions,
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
          <EuiText size={'s'}>
            <FormattedMessage
              id="xpack.aiops.changePointDetection.aggregationIntervalTitle"
              defaultMessage="Aggregation interval: "
            />
            {requestParams.interval}
          </EuiText>
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
    </div>
  );
};
