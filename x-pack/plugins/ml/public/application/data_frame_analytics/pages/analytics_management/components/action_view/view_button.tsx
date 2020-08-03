/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { getAnalysisType } from '../../../../common/analytics';
import { useNavigateToPath } from '../../../../../contexts/kibana';

import { getResultsUrl, DataFrameAnalyticsListRow } from '../analytics_list/common';

import { getViewLinkStatus } from './get_view_link_status';

interface ViewButtonProps {
  item: DataFrameAnalyticsListRow;
}

export const ViewButton: FC<ViewButtonProps> = ({ item }) => {
  const navigateToPath = useNavigateToPath();

  const { disabled, tooltipContent } = getViewLinkStatus(item);
  const analysisType = getAnalysisType(item.config.analysis);

  const onClickHandler = () => navigateToPath(getResultsUrl(item.id, analysisType));

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
      onClick={onClickHandler}
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
