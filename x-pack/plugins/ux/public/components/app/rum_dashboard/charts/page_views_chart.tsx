/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  AllSeries,
  fromQuery,
  RECORDS_FIELD,
  toQuery,
} from '@kbn/observability-plugin/public';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useDataView } from '../local_uifilters/use_data_view';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';

interface Props {
  breakdown: BreakdownItem | null;
}

export function PageViewsChart({ breakdown }: Props) {
  const { dataViewTitle } = useDataView();
  const history = useHistory();
  const { urlParams } = useLegacyUrlParams();

  const kibana = useKibanaServices();
  const { ExploratoryViewEmbeddable } = kibana.observability;

  const { start, end } = urlParams;

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
        [SERVICE_ENVIRONMENT]: urlParams?.environment
          ? [urlParams.environment]
          : ['ALL_VALUES'],
        [SERVICE_NAME]: urlParams.serviceName
          ? [urlParams.serviceName]
          : ['ALL_VALUES'],
      },
      breakdown: breakdown?.fieldName,
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
      customHeight="250px"
      attributes={allSeries}
      onBrushEnd={onBrushEnd}
      reportType="kpi-over-time"
      dataTypesIndexPatterns={{ ux: dataViewTitle }}
      isSingleMetric={true}
    />
  );
}
