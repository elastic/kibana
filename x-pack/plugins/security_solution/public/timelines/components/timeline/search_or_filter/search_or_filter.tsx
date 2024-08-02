/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { Filter } from '@kbn/es-query';

import type { FilterManager } from '@kbn/data-plugin/public';
import { DataViewPicker } from '../../../../sourcerer/experimental/components/dataview_picker';
import { isExperimentalSourcererEnabled } from '../../../../sourcerer/experimental/is_enabled';
import { TimelineType } from '../../../../../common/api/timeline';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import type { KqlMode } from '../../../store/model';
import type { DispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import type { KueryFilterQuery } from '../../../../../common/types/timeline';
import type { DataProvider } from '../data_providers/data_provider';
import { QueryBarTimeline } from '../query_bar';

import { TimelineDatePickerLock } from '../date_picker_lock';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { Sourcerer } from '../../../../sourcerer/components';
import {
  DATA_PROVIDER_HIDDEN_EMPTY,
  DATA_PROVIDER_HIDDEN_POPULATED,
  DATA_PROVIDER_VISIBLE,
} from './translations';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from '../tour/step_config';

interface Props {
  dataProviders: DataProvider[];
  filterManager: FilterManager;
  filterQuery: KueryFilterQuery;
  from: string;
  fromStr: string;
  isRefreshPaused: boolean;
  kqlMode: KqlMode;
  timelineId: string;
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) => void;
  refreshInterval: number;
  setSavedQueryId: (savedQueryId: string | null) => void;
  filters: Filter[];
  savedQueryId: string | null;
  to: string;
  toStr: string;
  updateReduxTime: DispatchUpdateReduxTime;
  isDataProviderVisible: boolean;
  toggleDataProviderVisibility: () => void;
  timelineType: TimelineType;
}

const SearchOrFilterContainer = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
`;

SearchOrFilterContainer.displayName = 'SearchOrFilterContainer';

const ModeFlexItem = styled(EuiFlexItem)`
  user-select: none; // Again, why?
`;

ModeFlexItem.displayName = 'ModeFlexItem';

export const SearchOrFilter = React.memo<Props>(
  ({
    dataProviders,
    isRefreshPaused,
    filters,
    filterManager,
    filterQuery,
    from,
    fromStr,
    kqlMode,
    timelineId,
    refreshInterval,
    savedQueryId,
    setSavedQueryId,
    to,
    toStr,
    updateReduxTime,
    isDataProviderVisible,
    toggleDataProviderVisibility,
    timelineType,
  }) => {
    const isDataProviderEmpty = useMemo(() => dataProviders?.length === 0, [dataProviders]);

    const dataProviderIconTooltipContent = useMemo(() => {
      if (isDataProviderVisible) {
        return DATA_PROVIDER_VISIBLE;
      }
      if (isDataProviderEmpty) {
        return DATA_PROVIDER_HIDDEN_EMPTY;
      }
      return DATA_PROVIDER_HIDDEN_POPULATED;
    }, [isDataProviderEmpty, isDataProviderVisible]);

    const buttonColor = useMemo(
      () => (isDataProviderEmpty || isDataProviderVisible ? 'primary' : 'warning'),
      [isDataProviderEmpty, isDataProviderVisible]
    );

    const dataviewPicker = isExperimentalSourcererEnabled() ? (
      <DataViewPicker />
    ) : (
      <Sourcerer scope={SourcererScopeName.timeline} />
    );

    return (
      <>
        <SearchOrFilterContainer>
          <EuiFlexGroup
            data-test-subj="timeline-search-or-filter"
            gutterSize="xs"
            alignItems="flexStart"
            responsive={false}
          >
            <EuiFlexItem grow={false} id={TIMELINE_TOUR_CONFIG_ANCHORS.DATA_VIEW}>
              {dataviewPicker}
            </EuiFlexItem>
            <EuiFlexItem data-test-subj="timeline-search-or-filter-search-container" grow={1}>
              <QueryBarTimeline
                dataProviders={dataProviders}
                filters={filters}
                filterManager={filterManager}
                filterQuery={filterQuery}
                from={from}
                fromStr={fromStr}
                kqlMode={kqlMode}
                isRefreshPaused={isRefreshPaused}
                refreshInterval={refreshInterval}
                savedQueryId={savedQueryId}
                setSavedQueryId={setSavedQueryId}
                timelineId={timelineId}
                to={to}
                toStr={toStr}
                updateReduxTime={updateReduxTime}
              />
            </EuiFlexItem>
            {
              /*
              DataProvider toggle is not needed in template timeline because
              it is always visible
              */
              timelineType === TimelineType.default ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={dataProviderIconTooltipContent}>
                    <EuiButtonIcon
                      id={TIMELINE_TOUR_CONFIG_ANCHORS.DATA_PROVIDER}
                      color={buttonColor}
                      isSelected={isDataProviderVisible}
                      iconType="timeline"
                      data-test-subj="toggle-data-provider"
                      size="m"
                      display="base"
                      aria-label={dataProviderIconTooltipContent}
                      onClick={toggleDataProviderVisibility}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null
            }
            <EuiFlexItem grow={false}>
              <TimelineDatePickerLock />
            </EuiFlexItem>

            <EuiFlexItem grow={false} data-test-subj="timeline-date-picker-container">
              <SuperDatePicker
                width="auto"
                id={InputsModelId.timeline}
                timelineId={timelineId}
                disabled={false}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </SearchOrFilterContainer>
      </>
    );
  }
);

SearchOrFilter.displayName = 'SearchOrFilter';
