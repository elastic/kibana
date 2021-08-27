/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { AlertsHistogramPanel } from '../../../detections/components/alerts_kpis/alerts_histogram_panel';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { Filter, Query } from '../../../../../../../src/plugins/data/public';
import { InputsModelId } from '../../../common/store/inputs/constants';
import * as i18n from '../../pages/translations';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { AlertsStackByField } from '../../../detections/components/alerts_kpis/common/types';

interface Props {
  combinedQueries?: string;
  filters?: Filter[];
  headerChildren?: React.ReactNode;
  /** Override all defaults, and only display this field */
  onlyField?: AlertsStackByField;
  query?: Query;
  setAbsoluteRangeDatePickerTarget?: InputsModelId;
  timelineId?: string;
}

const SignalsByCategoryComponent: React.FC<Props> = ({
  combinedQueries,
  filters,
  headerChildren,
  onlyField,
  query,
  setAbsoluteRangeDatePickerTarget = 'global',
  timelineId,
}) => {
  const dispatch = useDispatch();
  const { signalIndexName } = useSignalIndex();
  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      dispatch(
        setAbsoluteRangeDatePicker({
          id: setAbsoluteRangeDatePickerTarget,
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        })
      );
    },
    [dispatch, setAbsoluteRangeDatePickerTarget]
  );

  return (
    <AlertsHistogramPanel
      combinedQueries={combinedQueries}
      filters={filters}
      headerChildren={headerChildren}
      onlyField={onlyField}
      titleSize={onlyField == null ? 'm' : 's'}
      query={query}
      signalIndexName={signalIndexName}
      showTotalAlertsCount={true}
      showLinkToAlerts={onlyField == null ? true : false}
      showStackBy={onlyField == null}
      legendPosition={'right'}
      timelineId={timelineId}
      title={i18n.ALERT_COUNT}
      updateDateRange={updateDateRangeCallback}
    />
  );
};

SignalsByCategoryComponent.displayName = 'SignalsByCategoryComponent';

export const SignalsByCategory = React.memo(SignalsByCategoryComponent);
