/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSuperDatePicker } from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-service';
import { TimePickerQuickRange } from '@kbn/observability-shared-plugin/public/hooks/use_quick_time_ranges';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useDatasetQualityFilters } from '../../../hooks/use_dataset_quality_filters';
import { useKibanaContextForPlugin } from '../../../utils/use_kibana';
import { FilterBar } from './filter_bar';
import { IntegrationsSelector } from './integrations_selector';
import { NamespacesSelector } from './namespaces_selector';
import { QualitiesSelector } from './qualities_selector';
import { Selector } from './selector';

const typesLabel = i18n.translate('xpack.datasetQuality.types.label', {
  defaultMessage: 'Types',
});

const typesSearchPlaceholder = i18n.translate(
  'xpack.datasetQuality.selector.types.search.placeholder',
  {
    defaultMessage: 'Filter types',
  }
);

const typesNoneMatching = i18n.translate('xpack.datasetQuality.selector.types.noneMatching', {
  defaultMessage: 'No types found',
});

const typesNoneAvailable = i18n.translate('xpack.datasetQuality.selector.types.noneAvailable', {
  defaultMessage: 'No types available',
});

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Filters() {
  const {
    timeRange,
    onTimeChange,
    onRefresh,
    onRefreshChange,
    isLoading,
    integrations,
    namespaces,
    qualities,
    types,
    onIntegrationsChange,
    onNamespacesChange,
    onQualitiesChange,
    onTypesChange,
    selectedQuery,
    onQueryChange,
  } = useDatasetQualityFilters();

  const {
    services: { uiSettings },
  } = useKibanaContextForPlugin();

  const timePickerQuickRanges = uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = useMemo(
    () =>
      timePickerQuickRanges.map(({ from, to, display }) => ({
        start: from,
        end: to,
        label: display,
      })),
    [timePickerQuickRanges]
  );

  return (
    <EuiFlexGroup data-test-subj="datasetQualityFiltersContainer" gutterSize="s" wrap>
      <EuiFlexItem>
        <FilterBar query={selectedQuery} onQueryChange={onQueryChange} />
      </EuiFlexItem>
      <EuiFilterGroup>
        <IntegrationsSelector
          isLoading={isLoading}
          integrations={integrations}
          onIntegrationsChange={onIntegrationsChange}
        />
        <Selector
          label={typesLabel}
          searchPlaceholder={typesSearchPlaceholder}
          noneMatchingMessage={typesNoneMatching}
          noneAvailableMessage={typesNoneAvailable}
          options={types}
          onOptionsChange={onTypesChange}
        />
        <NamespacesSelector
          isLoading={isLoading}
          namespaces={namespaces}
          onNamespacesChange={onNamespacesChange}
        />
        <QualitiesSelector
          isLoading={isLoading}
          qualities={qualities}
          onQualitiesChange={onQualitiesChange}
        />
      </EuiFilterGroup>
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          onRefreshChange={onRefreshChange}
          commonlyUsedRanges={commonlyUsedRanges}
          showUpdateButton={true}
          isPaused={timeRange.refresh.pause}
          refreshInterval={timeRange.refresh.value}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
