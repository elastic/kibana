/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiSuperSelect } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ActionCreator } from 'typescript-fsa';

import { EventsByDataset } from '../../pages/overview/events_by_dataset';
import { SignalsByCategory } from '../../pages/overview/signals_by_category';
import { Filter, IIndexPattern, Query } from '../../../../../../src/plugins/data/public';
import { inputsModel } from '../../store';
import { InputsModelId } from '../../store/inputs/constants';
import { EventType } from '../../store/timeline/model';

import { TopNOption } from './helpers';
import * as i18n from './translations';

const TopNContainer = styled.div`
  width: 600px;
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

export interface Props {
  combinedQueries?: string;
  defaultView: EventType;
  deleteQuery?: ({ id }: { id: string }) => void;
  field: string;
  filters: Filter[];
  from: number;
  indexPattern: IIndexPattern;
  indexToAdd?: string[] | null;
  options: TopNOption[];
  query: Query;
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
  setAbsoluteRangeDatePickerTarget: InputsModelId;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
  to: number;
  toggleTopN: () => void;
  onFilterAdded?: () => void;
  value?: string[] | string | null;
}

const NO_FILTERS: Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };

const TopNComponent: React.FC<Props> = ({
  combinedQueries,
  defaultView,
  deleteQuery,
  filters = NO_FILTERS,
  field,
  from,
  indexPattern,
  indexToAdd,
  options,
  query = DEFAULT_QUERY,
  setAbsoluteRangeDatePicker,
  setAbsoluteRangeDatePickerTarget,
  setQuery,
  to,
  toggleTopN,
}) => {
  const [view, setView] = useState<EventType>(defaultView);
  const onViewSelected = useCallback((value: string) => setView(value as EventType), [setView]);

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

  return (
    <TopNContainer>
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
            filters={filters}
            from={from}
            headerChildren={headerChildren}
            indexPattern={indexPattern}
            indexToAdd={indexToAdd}
            onlyField={field}
            query={query}
            setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
            setQuery={setQuery}
            showSpacer={false}
            to={to}
          />
        ) : (
          <SignalsByCategory
            filters={filters}
            from={from}
            headerChildren={headerChildren}
            indexPattern={indexPattern}
            onlyField={field}
            query={query}
            setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
            setAbsoluteRangeDatePickerTarget={setAbsoluteRangeDatePickerTarget}
            setQuery={setQuery}
            to={to}
          />
        )}
      </TopNContent>
    </TopNContainer>
  );
};

TopNComponent.displayName = 'TopNComponent';

export const TopN = React.memo(TopNComponent);
