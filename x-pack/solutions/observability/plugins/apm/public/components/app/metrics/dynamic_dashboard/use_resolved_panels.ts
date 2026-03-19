/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import type { PanelDefinition, PanelSlot } from './types';
import { getLanguageDashboard } from './dashboards';

export function checkFieldExistence(slots: PanelSlot[], dataView: DataView): PanelSlot[] {
  return slots
    .map((slot) => ({
      ...slot,
      variants: slot.variants.filter((variant) =>
        variant.requiredFields.every((field) => dataView.getFieldByName(field) !== undefined)
      ),
    }))
    .filter((slot) => slot.variants.length > 0);
}

function collectRequiredFields(slots: PanelSlot[]): string[] {
  const fields = new Set<string>();
  for (const slot of slots) {
    for (const variant of slot.variants) {
      for (const field of variant.requiredFields) {
        fields.add(field);
      }
    }
  }
  return Array.from(fields);
}

export function resolveVariants(
  slots: PanelSlot[],
  fieldAvailability: Record<string, boolean>
): PanelDefinition[] {
  const resolved: PanelDefinition[] = [];

  for (const slot of slots) {
    for (const variant of slot.variants) {
      const allFieldsAvailable = variant.requiredFields.every(
        (field) => fieldAvailability[field] === true
      );

      if (allFieldsAvailable) {
        resolved.push({
          id: slot.id,
          title: slot.title,
          gridConfig: slot.gridConfig,
          variantId: variant.id,
          config: variant.config,
        });
        break;
      }
    }
  }

  return resolved;
}

export const useResolvedPanels = ({
  agentName,
  dataView,
  serviceName,
  indexPattern,
}: {
  agentName?: string;
  dataView?: DataView;
  serviceName: string;
  indexPattern?: string;
}) => {
  const dashboardFn = getLanguageDashboard(agentName);

  const slots = useMemo(() => {
    if (!dashboardFn || !indexPattern) {
      return [];
    }
    return dashboardFn(indexPattern);
  }, [dashboardFn, indexPattern]);

  const filteredSlots = useMemo(() => {
    if (!dataView || slots.length === 0) {
      return [];
    }
    return checkFieldExistence(slots, dataView);
  }, [slots, dataView]);

  const fieldsToProbe = useMemo(() => collectRequiredFields(filteredSlots), [filteredSlots]);

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (fieldsToProbe.length === 0 || !serviceName) {
        return Promise.resolve({ fieldAvailability: {} });
      }

      return callApmApi('POST /internal/apm/services/{serviceName}/metrics/has_fields', {
        params: {
          path: { serviceName },
          body: { fields: fieldsToProbe },
        },
      });
    },
    [fieldsToProbe, serviceName],
    { preservePreviousData: false, skipTimeRangeRefreshUpdate: true }
  );

  const panels = useMemo(() => {
    if (!data?.fieldAvailability || filteredSlots.length === 0) {
      return [];
    }
    return resolveVariants(filteredSlots, data.fieldAvailability);
  }, [data?.fieldAvailability, filteredSlots]);

  return {
    panels,
    hasDashboard: !!dashboardFn,
    status,
    isLoading: status === FETCH_STATUS.LOADING || status === FETCH_STATUS.NOT_INITIATED,
  };
};
