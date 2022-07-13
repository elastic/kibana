/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AllSeries } from '@kbn/observability-plugin/public';
import { useExpViewAttributes } from './use_exp_view_attrs';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import { useDataView } from '../local_uifilters/use_data_view';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { TRANSACTION_DURATION } from '../../../../../common/elasticsearch_fieldnames';

interface Props {
  breakdown: BreakdownItem | null;
  onPercentileChange: (min: number, max: number) => void;
}

export function PageLoadDistChart({ onPercentileChange, breakdown }: Props) {
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

  const { reportDefinitions, time } = useExpViewAttributes();

  const allSeries: AllSeries = [
    {
      time,
      reportDefinitions,
      dataType: 'ux',
      name: 'page-load-distribution',
      selectedMetricField: TRANSACTION_DURATION,
      breakdown: breakdown?.fieldName,
    },
  ];

  return (
    <ExploratoryViewEmbeddable
      customHeight={'300px'}
      attributes={allSeries}
      onBrushEnd={onBrushEnd}
      reportType="data-distribution"
      dataTypesIndexPatterns={{ ux: dataViewTitle }}
      legendIsVisible={Boolean(breakdown)}
      axisTitlesVisibility={{ x: true, yLeft: true, yRight: false }}
    />
  );
}
