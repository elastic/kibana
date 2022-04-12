/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiSuperSelect } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import { GlobalTimeArgs } from '../../containers/use_global_time';
import { EventsByDataset } from '../../../overview/components/events_by_dataset';
import { SignalsByCategory } from '../../../overview/components/signals_by_category';
import { InputsModelId } from '../../store/inputs/constants';
import { TimelineEventsType } from '../../../../common/types/timeline';
import { useSourcererDataView } from '../../containers/sourcerer';
import {
  isDetectionsAlertsTable,
  getSourcererScopeName,
  removeIgnoredAlertFilters,
  TopNOption,
} from './helpers';
import * as i18n from './translations';
import { AlertsStackByField } from '../../../detections/components/alerts_kpis/common/types';

const TopNContainer = styled.div`
  min-width: 600px;
`;

const CloseButton = styled(EuiButtonIcon)`
  z-index: 999999;
  position: absolute;
  right: 4px;
  top: 4px;
`;

const ViewSelect = styled(EuiSuperSelect)`
  z-index: 999999;
  width: 155px;
`;

const TopNContent = styled.div`
  margin-top: 4px;

  .euiPanel {
    border: none;
  }
`;

export interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'> {
  combinedQueries?: string;
  defaultView: TimelineEventsType;
  field: AlertsStackByField;
  filters: Filter[];
  indexPattern: DataViewBase;
  options: TopNOption[];
  paddingSize?: 's' | 'm' | 'l' | 'none';
  query: Query;
  setAbsoluteRangeDatePickerTarget: InputsModelId;
  showLegend?: boolean;
  timelineId?: string;
  toggleTopN: () => void;
  onFilterAdded?: () => void;
  value?: string[] | string | null;
}

const TopNComponent: React.FC<Props> = ({
  combinedQueries,
  defaultView,
  deleteQuery,
  filters,
  field,
  from,
  indexPattern,
  options,
  paddingSize,
  query,
  showLegend,
  setAbsoluteRangeDatePickerTarget,
  setQuery,
  timelineId,
  to,
  toggleTopN,
}) => {
  const [view, setView] = useState<TimelineEventsType>(defaultView);
  const onViewSelected = useCallback(
    (value: string) => setView(value as TimelineEventsType),
    [setView]
  );
  const { selectedPatterns, runtimeMappings } = useSourcererDataView(
    getSourcererScopeName({ timelineId, view })
  );

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const headerChildren = useMemo(
    () => (
      <ViewSelect
        data-test-subj="view-select"
        disabled={!isDetectionsAlertsTable(timelineId)}
        onChange={onViewSelected}
        options={options}
        valueOfSelected={view}
      />
    ),
    [onViewSelected, options, timelineId, view]
  );

  // alert workflow statuses (e.g. open | closed) and other alert-specific
  // filters must be ignored when viewing raw alerts
  const applicableFilters = useMemo(
    () => removeIgnoredAlertFilters({ filters, timelineId, view }),
    [filters, timelineId, view]
  );

  return (
    <TopNContainer data-test-subj="topN-container">
      <CloseButton
        aria-label={i18n.CLOSE}
        data-test-subj="close"
        iconType="cross"
        onClick={toggleTopN}
      />

      <TopNContent>
        {view === 'raw' || view === 'all' ? (
          <EventsByDataset
            combinedQueries={combinedQueries}
            deleteQuery={deleteQuery}
            filters={applicableFilters}
            from={from}
            headerChildren={headerChildren}
            indexPattern={indexPattern}
            indexNames={selectedPatterns}
            runtimeMappings={runtimeMappings}
            onlyField={field}
            paddingSize={paddingSize}
            query={query}
            queryType="topN"
            showLegend={showLegend}
            setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
            setQuery={setQuery}
            showSpacer={false}
            toggleTopN={toggleTopN}
            timelineId={timelineId}
            to={to}
          />
        ) : (
          <SignalsByCategory
            combinedQueries={combinedQueries}
            filters={applicableFilters}
            headerChildren={headerChildren}
            onlyField={field}
            paddingSize={paddingSize}
            query={query}
            showLegend={showLegend}
            setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
            timelineId={timelineId}
            runtimeMappings={runtimeMappings}
          />
        )}
      </TopNContent>
    </TopNContainer>
  );
};

TopNComponent.displayName = 'TopNComponent';

export const TopN = React.memo(TopNComponent);
