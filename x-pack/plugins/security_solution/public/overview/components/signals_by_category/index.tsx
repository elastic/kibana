/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import { AlertsHistogramPanel } from '../../../detections/components/alerts_histogram_panel';
import { alertsHistogramOptions } from '../../../detections/components/alerts_histogram_panel/config';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { SetAbsoluteRangeDatePicker } from '../../../network/pages/types';
import { Filter, IIndexPattern, Query } from '../../../../../../../src/plugins/data/public';
import { InputsModelId } from '../../../common/store/inputs/constants';
import * as i18n from '../../pages/translations';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };
const DEFAULT_STACK_BY = 'signal.rule.threat.tactic.name';
const NO_FILTERS: Filter[] = [];

interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'> {
  filters?: Filter[];
  headerChildren?: React.ReactNode;
  indexPattern: IIndexPattern;
  /** Override all defaults, and only display this field */
  onlyField?: string;
  query?: Query;
  setAbsoluteRangeDatePicker: SetAbsoluteRangeDatePicker;
  setAbsoluteRangeDatePickerTarget?: InputsModelId;
  timelineId?: string;
}

const SignalsByCategoryComponent: React.FC<Props> = ({
  deleteQuery,
  filters = NO_FILTERS,
  from,
  headerChildren,
  onlyField,
  query = DEFAULT_QUERY,
  setAbsoluteRangeDatePicker,
  setAbsoluteRangeDatePickerTarget = 'global',
  setQuery,
  timelineId,
  to,
}) => {
  const { signalIndexName } = useSignalIndex();
  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      setAbsoluteRangeDatePicker({ id: setAbsoluteRangeDatePickerTarget, from: min, to: max });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setAbsoluteRangeDatePicker]
  );

  const defaultStackByOption =
    alertsHistogramOptions.find((o) => o.text === DEFAULT_STACK_BY) ?? alertsHistogramOptions[0];

  return (
    <AlertsHistogramPanel
      deleteQuery={deleteQuery}
      defaultStackByOption={defaultStackByOption}
      filters={filters}
      from={from}
      headerChildren={headerChildren}
      onlyField={onlyField}
      query={query}
      signalIndexName={signalIndexName}
      setQuery={setQuery}
      showTotalAlertsCount={true}
      showLinkToAlerts={onlyField == null ? true : false}
      stackByOptions={onlyField == null ? alertsHistogramOptions : undefined}
      legendPosition={'right'}
      timelineId={timelineId}
      to={to}
      title={i18n.ALERT_COUNT}
      updateDateRange={updateDateRangeCallback}
    />
  );
};

SignalsByCategoryComponent.displayName = 'SignalsByCategoryComponent';

export const SignalsByCategory = React.memo(SignalsByCategoryComponent);
