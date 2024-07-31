/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { isEqual } from 'lodash';
import type { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import type { Filter } from '@kbn/es-query';
import objectHash from 'object-hash';
import { i18n } from '@kbn/i18n';
import { PrettyDuration } from '@elastic/eui';
import type { InvestigateWidgetGridItemOverride } from '../components/investigate_widget_grid';

enum OverrideType {
  timeRange = 'timeRange',
  filters = 'filters',
}

function getIdForFilter(filter: Filter) {
  return objectHash({ meta: filter.meta, query: filter.query });
}

function getLabelForFilter(filter: Filter) {
  return (
    filter.meta.alias ??
    filter.meta.key ??
    JSON.stringify({ meta: filter.meta, query: filter.query })
  );
}

export function getOverridesFromGlobalParameters(
  itemParameters: GlobalWidgetParameters,
  globalParameters: GlobalWidgetParameters,
  uiSettingsDateFormat: string
) {
  const overrides: InvestigateWidgetGridItemOverride[] = [];

  if (!isEqual(itemParameters.timeRange, globalParameters.timeRange)) {
    overrides.push({
      id: OverrideType.timeRange,
      label: (
        <PrettyDuration
          timeFrom={itemParameters.timeRange.from}
          timeTo={itemParameters.timeRange.to}
          dateFormat={uiSettingsDateFormat}
        />
      ),
    });
  }

  if (!isEqual(itemParameters.filters, globalParameters.filters)) {
    if (!itemParameters.filters.length) {
      overrides.push({
        id: OverrideType.filters,
        label: i18n.translate('xpack.investigateApp.overrides.noFilters', {
          defaultMessage: 'No filters',
        }),
      });
    }

    itemParameters.filters.forEach((filter) => {
      overrides.push({
        id: `${OverrideType.filters}_${getIdForFilter(filter)}`,
        label: getLabelForFilter(filter),
      });
    });
  }

  return overrides;
}
