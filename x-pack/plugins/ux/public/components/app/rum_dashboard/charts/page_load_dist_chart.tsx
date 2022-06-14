/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AllSeries } from '@kbn/observability-plugin/public';
import { BreakdownItem, UxUIFilters } from '../../../../../typings/ui_filters';
import { useDataView } from '../local_uifilters/use_data_view';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
} from '../../../../../common/elasticsearch_fieldnames';

interface Props {
  breakdown: BreakdownItem | null;
  onPercentileChange: (min: number, max: number) => void;
  start: string;
  end: string;
  uiFilters: UxUIFilters;
}

export function PageLoadDistChart({
  onPercentileChange,
  breakdown,
  uiFilters,
  start,
  end,
}: Props) {
  const { dataViewTitle } = useDataView();

  const kibana = useKibanaServices();
  const { ExploratoryViewEmbeddable } = kibana.observability!;

  const onBrushEnd = ({ range }: { range: number[] }) => {
    if (!range) {
      return;
    }
    const [minX, maxX] = range;
    onPercentileChange(minX, maxX);
  };

  const allSeries: AllSeries = [
    {
      dataType: 'ux',
      name: 'page-load-distribution',
      selectedMetricField: TRANSACTION_DURATION,
      reportDefinitions: {
        [SERVICE_ENVIRONMENT]: uiFilters?.environment
          ? [uiFilters.environment]
          : ['ALL_VALUES'],
        [SERVICE_NAME]: uiFilters?.serviceName ?? [],
      },
      time: {
        to: end,
        from: start,
      },
      breakdown: breakdown?.fieldName,
    },
  ];

  return (
    <ExploratoryViewEmbeddable
      customHeight={'250px'}
      attributes={allSeries}
      onBrushEnd={onBrushEnd}
      reportType="data-distribution"
      dataTypesIndexPatterns={{ ux: dataViewTitle }}
      isSingleMetric={true}
    />
  );
}
