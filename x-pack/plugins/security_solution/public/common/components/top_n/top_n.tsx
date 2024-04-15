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
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import { EventsByDataset } from '../../../overview/components/events_by_dataset';
import { SignalsByCategory } from '../../../overview/components/signals_by_category';
import type { InputsModelId } from '../../store/inputs/constants';
import type { TimelineEventsType } from '../../../../common/types/timeline';
import { useSourcererDataView } from '../../containers/sourcerer';
import type { TopNOption } from './helpers';
import { getSourcererScopeName, removeIgnoredAlertFilters } from './helpers';
import * as i18n from './translations';
import type { AlertsStackByField } from '../../../detections/components/alerts_kpis/common/types';

const TopNContainer = styled.div`
  min-width: 600px;
`;

const CloseButton = styled(EuiButtonIcon)`
  position: absolute;
  right: 4px;
  top: 4px;
`;

const ViewSelect = styled(EuiSuperSelect<string>)`
  width: 170px;
`;

const TopNContent = styled.div`
  margin-top: 4px;
  margin-right: ${({ theme }) => theme.eui.euiSizeXS};

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
  scopeId?: string;
  toggleTopN: () => void;
  onFilterAdded?: () => void; // eslint-disable-line react/no-unused-prop-types
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
  scopeId,
  to,
  toggleTopN,
}) => {
  const [view, setView] = useState<TimelineEventsType>(defaultView);
  const onViewSelected = useCallback(
    (value: string) => setView(value as TimelineEventsType),
    [setView]
  );
  const sourcererScopeId = getSourcererScopeName({ scopeId, view });
  const { selectedPatterns, runtimeMappings } = useSourcererDataView(sourcererScopeId);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const headerChildren = useMemo(
    () => (
      <ViewSelect
        data-test-subj="view-select"
        disabled={options.length === 1}
        onChange={onViewSelected}
        options={options}
        valueOfSelected={view}
      />
    ),
    [onViewSelected, options, view]
  );

  // alert workflow statuses (e.g. open | closed) and other alert-specific
  // filters must be ignored when viewing raw alerts
  const applicableFilters = useMemo(
    () => removeIgnoredAlertFilters({ filters, tableId: scopeId, view }),
    [filters, scopeId, view]
  );

  return (
    <TopNContainer data-test-subj="topN-container">
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
            scopeId={scopeId}
            sourcererScopeId={sourcererScopeId}
            to={to}
            hideQueryToggle
          />
        ) : (
          <SignalsByCategory
            filters={applicableFilters}
            headerChildren={headerChildren}
            onlyField={field}
            paddingSize={paddingSize}
            setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
            hideQueryToggle
          />
        )}
      </TopNContent>

      <CloseButton
        aria-label={i18n.CLOSE}
        data-test-subj="close"
        iconType="cross"
        onClick={toggleTopN}
      />
    </TopNContainer>
  );
};

TopNComponent.displayName = 'TopNComponent';

export const TopN = React.memo(TopNComponent);
