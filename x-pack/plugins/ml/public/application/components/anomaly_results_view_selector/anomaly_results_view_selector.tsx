/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';

import { EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useUrlState } from '../../util/url_state';
import { useMlUrlGenerator, useNavigateToPath } from '../../contexts/kibana';
import { ML_PAGES } from '../../../../common/constants/ml_url_generator';

interface Props {
  viewId: typeof ML_PAGES.SINGLE_METRIC_VIEWER | typeof ML_PAGES.ANOMALY_EXPLORER;
}

// Component for rendering a set of buttons for switching between the Anomaly Detection results views.

export const AnomalyResultsViewSelector: FC<Props> = ({ viewId }) => {
  const urlGenerator = useMlUrlGenerator();
  const navigateToPath = useNavigateToPath();

  const toggleButtonsIcons = useMemo(
    () => [
      {
        id: 'timeseriesexplorer',
        label: i18n.translate('xpack.ml.anomalyResultsViewSelector.singleMetricViewerLabel', {
          defaultMessage: 'View results in the Single Metric Viewer',
        }),
        iconType: 'visLine',
        value: ML_PAGES.SINGLE_METRIC_VIEWER,
        'data-test-subj': 'mlAnomalyResultsViewSelectorSingleMetricViewer',
      },
      {
        id: 'explorer',
        label: i18n.translate('xpack.ml.anomalyResultsViewSelector.anomalyExplorerLabel', {
          defaultMessage: 'View results in the Anomaly Explorer',
        }),
        iconType: 'visTable',
        value: ML_PAGES.ANOMALY_EXPLORER,
        'data-test-subj': 'mlAnomalyResultsViewSelectorExplorer',
      },
    ],
    []
  );

  const [globalState] = useUrlState('_g');

  const onChangeView = async (newViewId: Props['viewId']) => {
    const url = await urlGenerator.createUrl({
      page: newViewId,
      pageState: {
        globalState,
      },
    });
    await navigateToPath(url);
  };

  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.ml.anomalyResultsViewSelector.buttonGroupLegend', {
        defaultMessage: 'Anomaly results view selector',
      })}
      name="anomalyResultsViewSelector"
      data-test-subj="mlAnomalyResultsViewSelector"
      options={toggleButtonsIcons}
      idSelected={viewId}
      onChange={(newViewId: string) => onChangeView(newViewId as Props['viewId'])}
      isIconOnly
    />
  );
};
