/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';

import {
  getAnalysisType,
  isRegressionAnalysis,
  isOutlierAnalysis,
  isClassificationAnalysis,
} from '../../../../common/analytics';
import { useMlKibana } from '../../../../../contexts/kibana';

import { getResultsUrl, DataFrameAnalyticsListRow } from '../analytics_list/common';

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

  const analysisType = getAnalysisType(item.config.analysis);
  const isDisabled =
    !isRegressionAnalysis(item.config.analysis) &&
    !isOutlierAnalysis(item.config.analysis) &&
    !isClassificationAnalysis(item.config.analysis);

  const url = getResultsUrl(item.id, analysisType);
  const navigator = isManagementTable
    ? () => navigateToApp('ml', { path: url })
    : () => navigateToUrl(url);

  return (
    <EuiButtonEmpty
      isDisabled={isDisabled}
      onClick={navigator}
      size="xs"
      color="text"
      iconType="visTable"
      aria-label={i18n.translate('xpack.ml.dataframe.analyticsList.viewAriaLabel', {
        defaultMessage: 'View',
      })}
      data-test-subj="mlAnalyticsJobViewButton"
    >
      {i18n.translate('xpack.ml.dataframe.analyticsList.viewActionName', {
        defaultMessage: 'View',
      })}
    </EuiButtonEmpty>
  );
};
