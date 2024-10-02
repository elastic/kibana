/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPageSection,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Charts } from './components/charts';
import { DatePicker } from './components/date_picker';
import { useBreadcrumbs } from '../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { PLUGIN_NAME } from '../../common';
import { DatePickerProvider } from './hooks/use_date_picker';
import { useGetDataUsageMetrics } from '../hooks/use_get_usage_metrics';

export const DataUsage = () => {
  const {
    services: { chrome, appParams },
  } = useKibanaContextForPlugin();

  const { data, isFetching, isError } = useGetDataUsageMetrics({
    metricTypes: ['storage_retained', 'ingest_rate'],
    to: 1726908930000,
    from: 1726858530000,
  });

  const isLoading = isFetching || !data;

  useBreadcrumbs([{ text: PLUGIN_NAME }], appParams, chrome);

  return (
    <DatePickerProvider>
      <EuiTitle size="l">
        <h2>
          {i18n.translate('xpack.dataUsage.pageTitle', {
            defaultMessage: 'Data Usage',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPageSection paddingSize="none">
        <EuiFlexGroup alignItems="flexStart">
          <EuiFlexItem>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.dataUsage.description"
                defaultMessage="Monitor data ingested and retained by data streams."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <Charts data={response} />
      </EuiPageSection>
    </DatePickerProvider>
  );
};
