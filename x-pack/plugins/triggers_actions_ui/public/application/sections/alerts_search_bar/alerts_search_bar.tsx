/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { compareFilters, Query, TimeRange } from '@kbn/es-query';
import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { isQuickFiltersGroup, QuickFiltersMenuItem } from './quick_filters';
import { NO_INDEX_PATTERNS } from './constants';
import { SEARCH_BAR_PLACEHOLDER } from './translations';
import { AlertsSearchBarProps, QueryLanguageType } from './types';
import { useAlertDataViews } from '../../hooks/use_alert_data_view';
import { TriggersAndActionsUiServices } from '../../..';
import { useRuleAADFields } from '../../hooks/use_rule_aad_fields';
import { useLoadRuleTypesQuery } from '../../hooks/use_load_rule_types_query';

const SA_ALERTS = { type: 'alerts', fields: {} } as SuggestionsAbstraction;

// TODO Share buildEsQuery to be used between AlertsSearchBar and AlertsStateTable component https://github.com/elastic/kibana/issues/144615
// Also TODO: Replace all references to this component with the one from alerts-ui-shared
export function AlertsSearchBar({
  appName,
  disableQueryLanguageSwitcher = false,
  featureIds,
  ruleTypeId,
  query,
  filters,
  quickFilters = [],
  onQueryChange,
  onQuerySubmit,
  onFiltersUpdated,
  rangeFrom,
  rangeTo,
  showFilterBar = false,
  showDatePicker = true,
  showSubmitButton = true,
  placeholder = SEARCH_BAR_PLACEHOLDER,
  submitOnBlur = false,
  filtersForSuggestions,
  ...props
}: AlertsSearchBarProps) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<TriggersAndActionsUiServices>().services;

  const [queryLanguage, setQueryLanguage] = useState<QueryLanguageType>('kuery');
  const { dataViews, loading } = useAlertDataViews(featureIds ?? []);
  const { aadFields, loading: fieldsLoading } = useRuleAADFields(ruleTypeId);

  const indexPatterns =
    ruleTypeId && aadFields?.length ? [{ title: ruleTypeId, fields: aadFields }] : dataViews;

  const ruleType = useLoadRuleTypesQuery({
    filteredRuleTypes: ruleTypeId !== undefined ? [ruleTypeId] : [],
    enabled: ruleTypeId !== undefined,
  });

  const isSecurity =
    (featureIds && featureIds.length === 1 && featureIds.includes(AlertConsumers.SIEM)) ||
    (ruleType &&
      ruleTypeId &&
      ruleType.ruleTypesState.data.get(ruleTypeId)?.producer === AlertConsumers.SIEM);

  const onSearchQuerySubmit = useCallback(
    (
      { dateRange, query: nextQuery }: { dateRange: TimeRange; query?: Query },
      isUpdate?: boolean
    ) => {
      onQuerySubmit(
        {
          dateRange,
          query: typeof nextQuery?.query === 'string' ? nextQuery.query : undefined,
        },
        isUpdate
      );
      setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
    },
    [onQuerySubmit, setQueryLanguage]
  );

  const onSearchQueryChange = useCallback(
    ({ dateRange, query: nextQuery }: { dateRange: TimeRange; query?: Query }) => {
      onQueryChange?.({
        dateRange,
        query: typeof nextQuery?.query === 'string' ? nextQuery.query : undefined,
      });
      setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
    },
    [onQueryChange, setQueryLanguage]
  );
  const onRefresh = ({ dateRange }: { dateRange: TimeRange }) => {
    onQuerySubmit({
      dateRange,
    });
  };

  const additionalQueryBarMenuItems = useMemo(() => {
    if (showFilterBar && quickFilters.length > 0) {
      // EuiContextMenu expects a flattened panels structure so here we collect all
      // the nested panels in a linear list
      const panels = [] as EuiContextMenuPanelDescriptor[];
      const quickFiltersItemToContextMenuItem = (qf: QuickFiltersMenuItem) => {
        if (isQuickFiltersGroup(qf)) {
          const panelId = `quick-filters-panel-${panels.length}`;
          panels.push({
            id: panelId,
            title: qf.title,
            items: qf.items.map(
              quickFiltersItemToContextMenuItem
            ) as EuiContextMenuPanelItemDescriptor[],
            'data-test-subj': panelId,
          } as EuiContextMenuPanelDescriptor);
          return {
            name: qf.title,
            icon: qf.icon ?? 'filterInCircle',
            panel: panelId,
            'data-test-subj': `quick-filters-item-${qf.title}`,
          };
        } else {
          const { filter, ...menuItem } = qf;
          return {
            ...menuItem,
            icon: qf.icon ?? 'filterInCircle',
            onClick: () => {
              if (!filters?.some((f) => compareFilters(f, filter))) {
                onFiltersUpdated?.([...(filters ?? []), filter]);
              }
            },
            'data-test-subj': `quick-filters-item-${qf.name}`,
          };
        }
      };
      return {
        items: quickFilters.map(
          quickFiltersItemToContextMenuItem
        ) as EuiContextMenuPanelItemDescriptor[],
        panels,
      };
    } else {
      return {
        items: [],
        panels: [],
      };
    }
  }, [filters, onFiltersUpdated, quickFilters, showFilterBar]);

  return (
    <SearchBar
      appName={appName}
      disableQueryLanguageSwitcher={disableQueryLanguageSwitcher}
      // @ts-expect-error - DataView fields prop and SearchBar indexPatterns props are overly broad
      indexPatterns={loading || fieldsLoading ? NO_INDEX_PATTERNS : indexPatterns}
      placeholder={placeholder}
      query={{ query: query ?? '', language: queryLanguage }}
      filters={filters}
      additionalQueryBarMenuItems={additionalQueryBarMenuItems}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      displayStyle="inPage"
      showFilterBar={showFilterBar}
      onQuerySubmit={onSearchQuerySubmit}
      onFiltersUpdated={onFiltersUpdated}
      onRefresh={onRefresh}
      showDatePicker={showDatePicker}
      showQueryInput={true}
      saveQueryMenuVisibility="allowed_by_app_privilege"
      showSubmitButton={showSubmitButton}
      submitOnBlur={submitOnBlur}
      onQueryChange={onSearchQueryChange}
      suggestionsAbstraction={isSecurity ? undefined : SA_ALERTS}
      filtersForSuggestions={filtersForSuggestions}
      {...props}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { AlertsSearchBar as default };
