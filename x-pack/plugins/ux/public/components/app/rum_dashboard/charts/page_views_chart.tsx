/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import {
  AllSeries,
  fromQuery,
  RECORDS_FIELD,
  toQuery,
  useTheme,
} from '@kbn/observability-plugin/public';
import { useHistory } from 'react-router-dom';

import { BreakdownItem } from '../../../../../typings/ui_filters';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useDataView } from '../local_uifilters/use_data_view';
import { useExpViewAttributes } from './use_exp_view_attrs';

interface Props {
  breakdown: BreakdownItem | null;
}

export function PageViewsChart({ breakdown }: Props) {
  const { dataViewTitle } = useDataView();
  const history = useHistory();
  const kibana = useKibanaServices();
  const { ExploratoryViewEmbeddable } = kibana.observability;

  const theme = useTheme();

  const { reportDefinitions, time } = useExpViewAttributes();

  const allSeries: AllSeries = [
    {
      time,
      reportDefinitions,
      dataType: 'ux',
      name: 'ux-series-1',
      selectedMetricField: RECORDS_FIELD,
      breakdown: breakdown?.fieldName,
      color: theme.eui.euiColorVis1,
    },
  ];
  const onBrushEnd = ({ range }: { range: number[] }) => {
    if (!range) {
      return;
    }
    const [minX, maxX] = range;

    const rangeFrom = moment(minX).toISOString();
    const rangeTo = moment(maxX).toISOString();

    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        rangeFrom,
        rangeTo,
      }),
    });
  };

  return (
    <ExploratoryViewEmbeddable
      customHeight="300px"
      attributes={allSeries}
      onBrushEnd={onBrushEnd}
      reportType="kpi-over-time"
      dataTypesIndexPatterns={{ ux: dataViewTitle }}
      isSingleMetric={true}
      axisTitlesVisibility={{ x: false, yRight: true, yLeft: true }}
      legendIsVisible={Boolean(breakdown)}
    />
  );
}
