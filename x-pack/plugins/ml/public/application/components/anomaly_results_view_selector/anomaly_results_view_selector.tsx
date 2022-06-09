/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';

import { EuiButtonGroup, EuiButtonGroupProps } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useUrlState } from '../../util/url_state';
import { useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { ML_PAGES } from '../../../../common/constants/locator';

interface Props {
  viewId: typeof ML_PAGES.SINGLE_METRIC_VIEWER | typeof ML_PAGES.ANOMALY_EXPLORER;
  isSingleMetricViewerDisabled?: boolean;
}

/**
 * Component for rendering a set of buttons for switching between the Anomaly Detection results views.
 */
export const AnomalyResultsViewSelector: FC<Props> = ({
  viewId,
  isSingleMetricViewerDisabled = false,
}) => {
  const locator = useMlLocator()!;
  const navigateToPath = useNavigateToPath();

  const toggleButtonsIcons = useMemo<EuiButtonGroupProps['options']>(
    () => [
      {
        id: 'timeseriesexplorer',
        label: isSingleMetricViewerDisabled
          ? i18n.translate('xpack.ml.anomalyResultsViewSelector.singleMetricViewerDisabledLabel', {
              defaultMessage: 'Selected jobs are not viewable in the Single Metric Viewer',
            })
          : i18n.translate('xpack.ml.anomalyResultsViewSelector.singleMetricViewerLabel', {
              defaultMessage: 'View results in the Single Metric Viewer',
            }),
        iconType: 'visLine',
        value: ML_PAGES.SINGLE_METRIC_VIEWER,
        'data-test-subj': 'mlAnomalyResultsViewSelectorSingleMetricViewer',
        isDisabled: isSingleMetricViewerDisabled,
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
    [isSingleMetricViewerDisabled]
  );

  const [globalState] = useUrlState('_g');

  const onChangeView = async (newViewId: Props['viewId']) => {
    const url = await locator.getUrl({
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
