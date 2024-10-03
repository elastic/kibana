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
import { MetricsResponse } from './types';
import { useBreadcrumbs } from '../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { PLUGIN_NAME } from '../../common';
import { DatePickerProvider } from './hooks/use_date_picker';

const response: MetricsResponse = {
  charts: [
    {
      key: 'ingestedMax',
      series: [
        {
          streamName: 'data_stream_1',
          data: [
            { x: 1726858530000, y: 13756849 },
            { x: 1726862130000, y: 14657904 },
            { x: 1726865730000, y: 12798561 },
            { x: 1726869330000, y: 13578213 },
            { x: 1726872930000, y: 14123495 },
            { x: 1726876530000, y: 13876548 },
            { x: 1726880130000, y: 12894561 },
            { x: 1726883730000, y: 14478953 },
            { x: 1726887330000, y: 14678905 },
            { x: 1726890930000, y: 13976547 },
            { x: 1726894530000, y: 14568945 },
            { x: 1726898130000, y: 13789561 },
            { x: 1726901730000, y: 14478905 },
            { x: 1726905330000, y: 13956423 },
            { x: 1726908930000, y: 14598234 },
          ],
        },
        {
          streamName: 'data_stream_2',
          data: [
            { x: 1726858530000, y: 12894623 },
            { x: 1726862130000, y: 14436905 },
            { x: 1726865730000, y: 13794805 },
            { x: 1726869330000, y: 14048532 },
            { x: 1726872930000, y: 14237495 },
            { x: 1726876530000, y: 13745689 },
            { x: 1726880130000, y: 13974562 },
            { x: 1726883730000, y: 14234653 },
            { x: 1726887330000, y: 14323479 },
            { x: 1726890930000, y: 14023945 },
            { x: 1726894530000, y: 14189673 },
            { x: 1726898130000, y: 14247895 },
            { x: 1726901730000, y: 14098324 },
            { x: 1726905330000, y: 14478905 },
            { x: 1726908930000, y: 14323894 },
          ],
        },
        {
          streamName: 'data_stream_3',
          data: [
            { x: 1726858530000, y: 12576413 },
            { x: 1726862130000, y: 13956423 },
            { x: 1726865730000, y: 14568945 },
            { x: 1726869330000, y: 14234856 },
            { x: 1726872930000, y: 14368942 },
            { x: 1726876530000, y: 13897654 },
            { x: 1726880130000, y: 14456989 },
            { x: 1726883730000, y: 14568956 },
            { x: 1726887330000, y: 13987562 },
            { x: 1726890930000, y: 14567894 },
            { x: 1726894530000, y: 14246789 },
            { x: 1726898130000, y: 14567895 },
            { x: 1726901730000, y: 14457896 },
            { x: 1726905330000, y: 14567895 },
            { x: 1726908930000, y: 13989456 },
          ],
        },
      ],
    },
    {
      key: 'retainedMax',
      series: [
        {
          streamName: 'data_stream_1',
          data: [
            { x: 1726858530000, y: 12576413 },
            { x: 1726862130000, y: 13956423 },
            { x: 1726865730000, y: 14568945 },
            { x: 1726869330000, y: 14234856 },
            { x: 1726872930000, y: 14368942 },
            { x: 1726876530000, y: 13897654 },
            { x: 1726880130000, y: 14456989 },
            { x: 1726883730000, y: 14568956 },
            { x: 1726887330000, y: 13987562 },
            { x: 1726890930000, y: 14567894 },
            { x: 1726894530000, y: 14246789 },
            { x: 1726898130000, y: 14567895 },
            { x: 1726901730000, y: 14457896 },
            { x: 1726905330000, y: 14567895 },
            { x: 1726908930000, y: 13989456 },
          ],
        },
        {
          streamName: 'data_stream_2',
          data: [
            { x: 1726858530000, y: 12894623 },
            { x: 1726862130000, y: 14436905 },
            { x: 1726865730000, y: 13794805 },
            { x: 1726869330000, y: 14048532 },
            { x: 1726872930000, y: 14237495 },
            { x: 1726876530000, y: 13745689 },
            { x: 1726880130000, y: 13974562 },
            { x: 1726883730000, y: 14234653 },
            { x: 1726887330000, y: 14323479 },
            { x: 1726890930000, y: 14023945 },
            { x: 1726894530000, y: 14189673 },
            { x: 1726898130000, y: 14247895 },
            { x: 1726901730000, y: 14098324 },
            { x: 1726905330000, y: 14478905 },
            { x: 1726908930000, y: 14323894 },
          ],
        },
        {
          streamName: 'data_stream_3',
          data: [
            { x: 1726858530000, y: 12576413 },
            { x: 1726862130000, y: 13956423 },
            { x: 1726865730000, y: 14568945 },
            { x: 1726869330000, y: 14234856 },
            { x: 1726872930000, y: 14368942 },
            { x: 1726876530000, y: 13897654 },
            { x: 1726880130000, y: 14456989 },
            { x: 1726883730000, y: 14568956 },
            { x: 1726887330000, y: 13987562 },
            { x: 1726890930000, y: 14567894 },
            { x: 1726894530000, y: 14246789 },
            { x: 1726898130000, y: 14567895 },
            { x: 1726901730000, y: 14457896 },
            { x: 1726905330000, y: 14567895 },
            { x: 1726908930000, y: 13989456 },
          ],
        },
        // Repeat similar structure for more data streams...
      ],
    },
  ],
};

export const DataUsage = () => {
  const {
    services: { chrome, appParams },
  } = useKibanaContextForPlugin();

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
