/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import type { Filter } from '@kbn/es-query';

import type { FilterManager } from '@kbn/data-plugin/public';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import type { KqlMode } from '../../../store/timeline/model';
import type { DispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import type { KueryFilterQuery } from '../../../../../common/types/timeline';
import type { DataProvider } from '../data_providers/data_provider';
import { QueryBarTimeline } from '../query_bar';

import { TimelineDatePickerLock } from '../date_picker_lock';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { Sourcerer } from '../../../../common/components/sourcerer';
import {
  DATA_PROVIDER_HIDDEN_EMPTY,
  DATA_PROVIDER_HIDDEN_POPULATED,
  DATA_PROVIDER_VISIBLE,
} from './translations';

const timelineSelectModeItemsClassName = 'timelineSelectModeItemsClassName';
const searchOrFilterPopoverClassName = 'searchOrFilterPopover';
const searchOrFilterPopoverWidth = '352px';

// SIDE EFFECT: the following creates a global class selector
const SearchOrFilterGlobalStyle = createGlobalStyle`
  .${timelineSelectModeItemsClassName} {
    width: 350px !important;
  }

  .${searchOrFilterPopoverClassName}.euiPopover__panel {
    width: ${searchOrFilterPopoverWidth} !important;

    .euiSuperSelect__listbox {
      width: ${searchOrFilterPopoverWidth} !important;
    }
  }
`;

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
  setFilters: (filters: Filter[]) => void;
  setSavedQueryId: (savedQueryId: string | null) => void;
  filters: Filter[];
  savedQueryId: string | null;
  to: string;
  toStr: string;
  updateReduxTime: DispatchUpdateReduxTime;
  isDataProviderVisible: boolean;
  toggleDataProviderVisibility: () => void;
}

const SearchOrFilterContainer = styled.div``;

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
    setFilters,
    setSavedQueryId,
    to,
    toStr,
    updateKqlMode,
    updateReduxTime,
    isDataProviderVisible,
    toggleDataProviderVisibility,
  }) => {
    return (
      <>
        <SearchOrFilterContainer>
          <EuiFlexGroup
            data-test-subj="timeline-search-or-filter"
            gutterSize="xs"
            alignItems="center"
          >
            <EuiFlexItem grow={false}>
              <Sourcerer scope={SourcererScopeName.timeline} />
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
                setFilters={setFilters}
                setSavedQueryId={setSavedQueryId}
                timelineId={timelineId}
                to={to}
                toStr={toStr}
                updateReduxTime={updateReduxTime}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                direction="row"
                gutterSize="none"
                alignItems="center"
                justifyContent="center"
              >
                <EuiToolTip
                  content={
                    dataProviders?.length > 0 && !isDataProviderVisible
                      ? DATA_PROVIDER_HIDDEN_POPULATED
                      : dataProviders?.length === 0 && !isDataProviderVisible
                      ? DATA_PROVIDER_HIDDEN_EMPTY
                      : DATA_PROVIDER_VISIBLE
                  }
                >
                  <EuiButtonIcon
                    color={
                      dataProviders?.length > 0 && !isDataProviderVisible ? 'warning' : 'primary'
                    }
                    isSelected={isDataProviderVisible}
                    iconType={'timeline'}
                    size="m"
                    display="base"
                    aria-label={
                      dataProviders?.length > 0 && !isDataProviderVisible
                        ? DATA_PROVIDER_HIDDEN_POPULATED
                        : dataProviders?.length === 0 && !isDataProviderVisible
                        ? DATA_PROVIDER_HIDDEN_EMPTY
                        : DATA_PROVIDER_VISIBLE
                    }
                    onClick={toggleDataProviderVisibility}
                  />
                </EuiToolTip>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TimelineDatePickerLock />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <SuperDatePicker
                width="auto"
                id={InputsModelId.timeline}
                timelineId={timelineId}
                disabled={false}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </SearchOrFilterContainer>
        <SearchOrFilterGlobalStyle />
      </>
    );
  }
);

SearchOrFilter.displayName = 'SearchOrFilter';
