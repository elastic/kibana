/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { SloTabId } from '../../../pages/slo_details/components/slo_details';
import { TimeBounds } from '../../../pages/slo_details/types';
import { useKibana } from '../../../utils/kibana_react';
import { getDelayInSecondsFromSLO } from '../../../utils/slo/get_delay_in_seconds_from_slo';
import { AlertAnnotation, TimeRange, useLensDefinition } from './use_lens_definition';

interface Props {
  slo: SLOWithSummaryResponse;
  dataTimeRange: TimeRange;
  threshold: number;
  alertTimeRange?: TimeRange;
  showErrorRateAsLine?: boolean;
  annotations?: AlertAnnotation[];
  selectedTabId?: SloTabId;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function ErrorRateChart({
  slo,
  dataTimeRange,
  threshold,
  alertTimeRange,
  showErrorRateAsLine,
  annotations,
  onBrushed,
  selectedTabId,
}: Props) {
  const {
    lens: { EmbeddableComponent },
  } = useKibana().services;
  const lensDef = useLensDefinition({
    slo,
    threshold,
    alertTimeRange,
    dataTimeRange,
    annotations,
    showErrorRateAsLine,
    selectedTabId,
  });
  const delayInSeconds = getDelayInSecondsFromSLO(slo);

  const from = moment(dataTimeRange.from).subtract(delayInSeconds, 'seconds').toISOString();
  const to = moment(dataTimeRange.to).subtract(delayInSeconds, 'seconds').toISOString();

  return (
    <EmbeddableComponent
      id="sloErrorRateChart"
      style={{ height: 190 }}
      timeRange={{
        from,
        to,
      }}
      attributes={lensDef}
      viewMode={ViewMode.VIEW}
      onBrushEnd={({ range }) => {
        onBrushed?.({
          from: moment(range[0]).toDate(),
          to: moment(range[1]).toDate(),
        });
      }}
      noPadding
    />
  );
}
