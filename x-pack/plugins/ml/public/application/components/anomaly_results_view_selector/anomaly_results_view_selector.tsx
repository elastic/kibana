/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { encode } from 'rison-node';

import { EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useUrlState } from '../../util/url_state';

interface Props {
  viewId: 'timeseriesexplorer' | 'explorer';
}

// Component for rendering a set of buttons for switching between the Anomaly Detection results views.

export const AnomalyResultsViewSelector: FC<Props> = ({ viewId }) => {
  const toggleButtonsIcons = useMemo(
    () => [
      {
        id: 'timeseriesexplorer',
        label: i18n.translate('xpack.ml.anomalyResultsViewSelector.singleMetricViewerLabel', {
          defaultMessage: 'View results in the Single Metric Viewer',
        }),
        iconType: 'stats',
        value: 'timeseriesexplorer',
        'data-test-subj': 'mlAnomalyResultsViewSelectorSingleMetricViewer',
      },
      {
        id: 'explorer',
        label: i18n.translate('xpack.ml.anomalyResultsViewSelector.anomalyExplorerLabel', {
          defaultMessage: 'View results in the Anomaly Explorer',
        }),
        iconType: 'tableOfContents',
        value: 'explorer',
        'data-test-subj': 'mlAnomalyResultsViewSelectorExplorer',
      },
    ],
    []
  );

  const [globalState] = useUrlState('_g');

  const onChangeView = (newViewId: string) => {
    const fullGlobalStateString = globalState !== undefined ? `?_g=${encode(globalState)}` : '';
    window.open(`#/${newViewId}${fullGlobalStateString}`, '_self');
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
      onChange={onChangeView}
      isIconOnly
    />
  );
};
