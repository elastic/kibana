/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';

import { getViewLinkStatus } from './get_view_link_status';

export const viewActionButtonText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.viewActionName',
  {
    defaultMessage: 'View',
  }
);

interface ViewButtonProps {
  item: DataFrameAnalyticsListRow;
}

export const ViewButton: FC<ViewButtonProps> = ({ item }) => {
  const { disabled, tooltipContent } = getViewLinkStatus(item);

  if (disabled) {
    return (
      <EuiToolTip position="top" content={tooltipContent}>
        <>{viewActionButtonText}</>
      </EuiToolTip>
    );
  }

  return <>{viewActionButtonText}</>;
};
