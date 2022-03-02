/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import type { Filter } from '@kbn/es-query';

import type { FilterManager } from '../../../../../../../../src/plugins/data/public';
import { KqlMode } from '../../../../timelines/store/timeline/model';
import { DispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { KueryFilterQuery } from '../../../../../common/types/timeline';
import { DataProvider } from '../data_providers/data_provider';
import { QueryBarTimeline } from '../query_bar';

import { EuiSuperSelect } from './super_select';
import { options } from './helpers';
import * as i18n from './translations';

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
}

const SearchOrFilterContainer = styled.div`
  ${({ theme }) => `margin-top: ${theme.eui.euiSizeXS};`}
  user-select: none;
  .globalQueryBar {
    padding: 0px;
    .kbnQueryBar {
      div:first-child {
        margin-right: 0px;
      }
    }
    .globalFilterGroup__wrapper.globalFilterGroup__wrapper-isVisible {
      height: auto !important;
    }
  }
`;

SearchOrFilterContainer.displayName = 'SearchOrFilterContainer';

const ModeFlexItem = styled(EuiFlexItem)`
  user-select: none;
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
  }) => {
    const handleChange = useCallback(
      (mode: KqlMode) => updateKqlMode({ id: timelineId, kqlMode: mode }),
      [timelineId, updateKqlMode]
    );

    return (
      <>
        <SearchOrFilterContainer>
          <EuiFlexGroup data-test-subj="timeline-search-or-filter" gutterSize="xs">
            <ModeFlexItem grow={false}>
              <EuiToolTip content={i18n.FILTER_OR_SEARCH_WITH_KQL}>
                <EuiSuperSelect
                  data-test-subj="timeline-select-search-or-filter"
                  hasDividers={true}
                  itemLayoutAlign="top"
                  itemClassName={timelineSelectModeItemsClassName}
                  onChange={handleChange}
                  options={options}
                  popoverProps={{ className: searchOrFilterPopoverClassName }}
                  valueOfSelected={kqlMode}
                />
              </EuiToolTip>
            </ModeFlexItem>
            <EuiFlexItem data-test-subj="timeline-search-or-filter-search-container">
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
          </EuiFlexGroup>
        </SearchOrFilterContainer>
        <SearchOrFilterGlobalStyle />
      </>
    );
  }
);

SearchOrFilter.displayName = 'SearchOrFilter';
