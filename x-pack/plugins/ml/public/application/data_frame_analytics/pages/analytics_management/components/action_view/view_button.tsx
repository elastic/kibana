/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { getAnalysisType } from '../../../../common/analytics';
import { useMlKibana } from '../../../../../contexts/kibana';

import { getResultsUrl, DataFrameAnalyticsListRow } from '../analytics_list/common';

import { getViewLinkStatus } from './get_view_link_status';

interface ViewButtonProps {
  item: DataFrameAnalyticsListRow;
  isManagementTable: boolean;
}

export const ViewButton: FC<ViewButtonProps> = ({ item, isManagementTable }) => {
  const {
    services: {
      application: { navigateToUrl, navigateToApp },
    },
  } = useMlKibana();

  const { disabled, tooltipContent } = getViewLinkStatus(item);
  const analysisType = getAnalysisType(item.config.analysis);

  const url = getResultsUrl(item.id, analysisType);
  const navigator = isManagementTable
    ? () => navigateToApp('ml', { path: url })
    : () => navigateToUrl(url);

  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.viewActionName', {
    defaultMessage: 'View',
  });

  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="mlAnalyticsJobViewButton"
      flush="left"
      iconType="visTable"
      isDisabled={disabled}
      onClick={navigator}
      size="xs"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (disabled) {
    return (
      <EuiToolTip position="top" content={tooltipContent}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
