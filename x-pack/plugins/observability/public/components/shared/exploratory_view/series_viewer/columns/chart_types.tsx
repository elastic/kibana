/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useKibana,
  ToolbarButton,
} from '../../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../../plugin';
import { SeriesUrl, useFetcher } from '../../../../..';
import { SeriesConfig } from '../../types';
import { SeriesChartTypesSelect } from '../../series_editor/columns/chart_types';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}

export function SeriesChartTypes({ seriesId, series, seriesConfig }: Props) {
  const seriesType = series?.seriesType ?? seriesConfig.defaultSeriesType;

  const {
    services: { lens },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const { data = [] } = useFetcher(() => lens.getXyVisTypes(), [lens]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      button={
        <EuiToolTip content={EDIT_CHART_TYPE_LABEL}>
          <ToolbarButton
            size="s"
            iconType={(data ?? []).find(({ id }) => id === seriesType)?.icon!}
            aria-label={CHART_TYPE_LABEL}
            onClick={() => setIsPopoverOpen((prevState) => !prevState)}
          />
        </EuiToolTip>
      }
    >
      <SeriesChartTypesSelect
        seriesId={seriesId}
        series={series}
        defaultChartType={seriesConfig.defaultSeriesType}
      />
    </EuiPopover>
  );
}

const EDIT_CHART_TYPE_LABEL = i18n.translate(
  'xpack.observability.expView.seriesEditor.editChartSeriesLabel',
  {
    defaultMessage: 'Edit chart type for series',
  }
);

const CHART_TYPE_LABEL = i18n.translate('xpack.observability.expView.chartTypes.label', {
  defaultMessage: 'Chart type',
});
