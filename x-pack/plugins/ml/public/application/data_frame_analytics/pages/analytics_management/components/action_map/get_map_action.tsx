/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTableActionsColumnType } from '@elastic/eui';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';

import { MapButton } from './map_button';

export const getMapAction = (): EuiTableActionsColumnType<
  DataFrameAnalyticsListRow
>['actions'][number] => ({
  isPrimary: true,
  render: (item: DataFrameAnalyticsListRow) => <MapButton item={item} />,
});
