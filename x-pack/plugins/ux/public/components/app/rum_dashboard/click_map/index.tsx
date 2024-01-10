/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';

import { useFetchClickData } from './use_fetch_click_data';
import { MonitorSelector } from './monitor_selector';

export function ClickMap() {
  const {
    urlParams: { serviceName, environment, rangeFrom, rangeTo },
  } = useLegacyUrlParams();

  const clickData = useFetchClickData({
    serviceName,
    environment,
    rangeFrom,
    rangeTo,
    minWidth: 769,
    maxWidth: 1200,
    referenceWidth: 800,
    referenceHeight: 900,
  });

  // console.log('clickData');
  // console.log(clickData);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" direction={'column'}>
      <EuiFlexItem>
        <MonitorSelector />
      </EuiFlexItem>
      <EuiFlexItem />
    </EuiFlexGroup>
  );
}
