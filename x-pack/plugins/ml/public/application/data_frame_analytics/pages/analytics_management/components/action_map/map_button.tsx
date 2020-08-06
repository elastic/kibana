/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import {
  getAnalysisType,
  isRegressionAnalysis,
  isOutlierAnalysis,
  isClassificationAnalysis,
} from '../../../../common/analytics';
import { useNavigateToPath } from '../../../../../contexts/kibana';

import { getJobMapUrl, DataFrameAnalyticsListRow } from '../analytics_list/common';

import { getViewLinkStatus } from './get_view_link_status';

interface MapButtonProps {
  item: DataFrameAnalyticsListRow;
}

export const MapButton: FC<MapButtonProps> = ({ item }) => {
  const navigateToPath = useNavigateToPath();
  const isDisabled =
    !isRegressionAnalysis(item.config.analysis) &&
    !isOutlierAnalysis(item.config.analysis) &&
    !isClassificationAnalysis(item.config.analysis);
  const analysisType = getAnalysisType(item.config.analysis);

  const onClickHandler = () => navigateToPath(getJobMapUrl(item.id, analysisType));

  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.mapActionName', {
    defaultMessage: 'Map',
  });

  return (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="mlAnalyticsJobMapButton"
      flush="left"
      iconType="graphApp"
      isDisabled={isDisabled}
      onClick={onClickHandler}
      size="xs"
    >
      {buttonText}
    </EuiButtonEmpty>
  );
};
