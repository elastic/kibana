/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { Filter, Query } from '@kbn/es-query';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { AlertsHistogramPanel } from '../../../detections/components/alerts_kpis/alerts_histogram_panel';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';

import { InputsModelId } from '../../../common/store/inputs/constants';
import type { UpdateDateRange } from '../../../common/components/charts/common';

import type { AlertsStackByField } from '../../../detections/components/alerts_kpis/common/types';

import * as i18n from '../../pages/translations';

import { useFiltersForSignalsByCategory } from './use_filters_for_signals_by_category';

interface Props {
  combinedQueries?: string;
  filters: Filter[];
  headerChildren?: React.ReactNode;
  /** Override all defaults, and only display this field */
  onlyField?: AlertsStackByField;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  query?: Query;
  setAbsoluteRangeDatePickerTarget?: InputsModelId;
  showLegend?: boolean;
  runtimeMappings?: MappingRuntimeFields;
  hideQueryToggle?: boolean;
}

const SignalsByCategoryComponent: React.FC<Props> = ({
  combinedQueries,
  filters,
  headerChildren,
  onlyField,
  paddingSize,
  query,
  showLegend,
  setAbsoluteRangeDatePickerTarget = InputsModelId.global,
  runtimeMappings,
  hideQueryToggle = false,
}) => {
  const dispatch = useDispatch();
  const { signalIndexName } = useSignalIndex();
  const filtersForSignalsByCategory = useFiltersForSignalsByCategory(filters);

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
      filters={filtersForSignalsByCategory}
      headerChildren={headerChildren}
      legendPosition={'right'}
      onlyField={onlyField}
      paddingSize={paddingSize}
      query={query}
      showLegend={showLegend}
      showLinkToAlerts={onlyField == null ? true : false}
      showStackBy={onlyField == null}
      showTotalAlertsCount={true}
      signalIndexName={signalIndexName}
      runtimeMappings={runtimeMappings}
      title={i18n.ALERT_TREND}
      titleSize={onlyField == null ? 'm' : 's'}
      updateDateRange={updateDateRangeCallback}
      hideQueryToggle={hideQueryToggle}
    />
  );
};

SignalsByCategoryComponent.displayName = 'SignalsByCategoryComponent';

export const SignalsByCategory = React.memo(SignalsByCategoryComponent);
