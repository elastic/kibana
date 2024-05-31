/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isEmpty } from 'lodash/fp';
import moment from 'moment';

import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { Embeddable } from '@kbn/embeddable-plugin/public';
import type { HistogramData, AlertsAggregation, AlertsBucket, AlertsGroupBucket } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import { RESET_GROUP_BY_FIELDS } from '../../../../common/components/chart_settings_popover/configurations/default/translations';
import type { LensDataTableEmbeddable } from '../../../../common/components/visualization_actions/types';

const EMPTY_ALERTS_DATA: HistogramData[] = [];

export const formatAlertsData = (alertsData: AlertSearchResponse<{}, AlertsAggregation> | null) => {
  const groupBuckets: AlertsGroupBucket[] =
    alertsData?.aggregations?.alertsByGrouping?.buckets ?? [];
  return groupBuckets.reduce<HistogramData[]>(
    (acc, { key_as_string: keyAsString, key: group, alerts }) => {
      const alertsBucket: AlertsBucket[] = alerts.buckets ?? [];

      return [
        ...acc,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ...alertsBucket.map(({ key, doc_count }: AlertsBucket) => ({
          x: key,
          y: doc_count,
          g: keyAsString ?? group.toString(),
        })),
      ];
    },
    EMPTY_ALERTS_DATA
  );
};

export const getAlertsHistogramQuery = (
  stackByField: string,
  from: string,
  to: string,
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>,
  runtimeMappings?: MappingRuntimeFields
) => {
  return {
    aggs: {
      alertsByGrouping: {
        terms: {
          field: stackByField,
          order: {
            _count: 'desc',
          },
          size: 10,
        },
        aggs: {
          alerts: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: `${Math.floor(moment(to).diff(moment(from)) / 32)}ms`,
              min_doc_count: 0,
              extended_bounds: {
                min: from,
                max: to,
              },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          ...additionalFilters,
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    _source: false,
    size: 0,
  };
};

/**
 * Returns `true` when the alerts histogram initial loading spinner should be shown
 *
 * @param isInitialLoading The loading spinner will only be displayed if this value is `true`, because after initial load, a different, non-spinner loading indicator is displayed
 * @param isLoadingAlerts When `true`, IO is being performed to request alerts (for rendering in the histogram)
 */
export const showInitialLoadingSpinner = ({
  isInitialLoading,
  isLoadingAlerts,
}: {
  isInitialLoading: boolean;
  isLoadingAlerts: boolean;
}): boolean => isInitialLoading && isLoadingAlerts;

export const parseFilterQuery = (query?: string) => {
  try {
    return query != null && !isEmpty(query) ? JSON.parse(query) : {};
  } catch {
    return {};
  }
};

export const buildFilterQuery = (query?: string) => {
  try {
    return isEmpty(query) ? [] : [parseFilterQuery(query)];
  } catch {
    return [];
  }
};

interface CreateResetGroupByFieldActionProps {
  callback?: () => void;
  order?: number;
}

type CreateResetGroupByFieldAction = (params?: CreateResetGroupByFieldActionProps) => Action;
export const createResetGroupByFieldAction: CreateResetGroupByFieldAction = ({
  callback,
  order,
} = {}) => ({
  id: 'resetGroupByField',
  getDisplayName(): string {
    return RESET_GROUP_BY_FIELDS;
  },
  getIconType(): string | undefined {
    return 'editorRedo';
  },
  type: 'actionButton',
  async isCompatible(): Promise<boolean> {
    return true;
  },
  async execute({
    embeddable,
  }: ActionExecutionContext<{
    embeddable: Embeddable<LensDataTableEmbeddable>;
  }>): Promise<void> {
    callback?.();

    const input = embeddable.getInput();
    const {
      attributes: {
        state: {
          visualization: { columns },
        },
      },
    } = input;

    // Unhide all the columns
    embeddable.updateInput({
      ...input,
      attributes: {
        ...input.attributes,
        state: {
          ...input.attributes.state,
          visualization: {
            ...input.attributes.state.visualization,
            columns: columns.map((c) => ({
              ...c,
              hidden: false,
            })),
          },
        },
      },
    });
  },
  order,
});

export const createGenericSubtitle = (
  isInitialLoading: boolean,
  showTotalAlertsCount: boolean,
  totalAlerts: string
) => !isInitialLoading && showTotalAlertsCount && totalAlerts;

export const createEmbeddedDataSubtitle = (
  embeddedDataLoaded: boolean,
  embeddedDataAvailable: boolean,
  totalAlerts: string
) => embeddedDataLoaded && embeddedDataAvailable && totalAlerts;
