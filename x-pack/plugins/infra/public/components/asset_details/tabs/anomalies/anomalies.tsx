/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { AnomaliesTable } from '../../../../pages/metrics/inventory_view/components/ml/anomaly_detection/anomalies_table/anomalies_table';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useIntersectingState } from '../../hooks/use_intersecting_state';
import { useRequestObservable } from '../../hooks/use_request_observable';

export const Anomalies = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { request$ } = useRequestObservable();
  const { getParsedDateRange } = useDatePickerContext();
  const { asset, overrides } = useAssetDetailsRenderPropsContext();
  const { onClose = () => {} } = overrides?.anomalies ?? {};

  const parsedDateRange = useMemo(() => getParsedDateRange(), [getParsedDateRange]);
  const state = useIntersectingState(ref, {
    parsedDateRange,
  });

  return (
    <div ref={ref}>
      <AnomaliesTable
        closeFlyout={onClose}
        hostName={asset.name}
        dateRange={state.parsedDateRange}
        hideDatePicker
        request$={request$}
      />
    </div>
  );
};
