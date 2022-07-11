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
  ALL_VALUES_SELECTED,
  fromQuery,
  RECORDS_FIELD,
  toQuery,
  useTheme,
} from '@kbn/observability-plugin/public';
import { useHistory } from 'react-router-dom';

import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { BreakdownItem, UxUIFilters } from '../../../../../typings/ui_filters';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useDataView } from '../local_uifilters/use_data_view';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';

interface Props {
  breakdown: BreakdownItem | null;
  uiFilters: UxUIFilters;
}

export function PageViewsChart({ breakdown, uiFilters }: Props) {
  const { dataViewTitle } = useDataView();
  const history = useHistory();
  const { urlParams } = useLegacyUrlParams();
  const kibana = useKibanaServices();
  const { ExploratoryViewEmbeddable } = kibana.observability;
  const { start, end } = urlParams;

  const theme = useTheme();

  const allSeries: AllSeries = [
    {
      dataType: 'ux',
      time: {
        from: start ?? '',
        to: end ?? '',
      },
      name: 'ux-series-1',
      selectedMetricField: RECORDS_FIELD,
      reportDefinitions: {
        [SERVICE_ENVIRONMENT]:
          !uiFilters?.environment ||
          uiFilters.environment === ENVIRONMENT_ALL.value
            ? [ALL_VALUES_SELECTED]
            : [uiFilters.environment],
        [SERVICE_NAME]: urlParams.serviceName
          ? [urlParams.serviceName]
          : [ALL_VALUES_SELECTED],
      },
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
    />
  );
}
