/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiComboBox } from '@elastic/eui';
import { useFetcher } from '../../../hooks/use_fetcher';

export interface DashboardPickerProps {
  onChange: (dashboard: DashboardOption | null) => void;
  isDisabled?: boolean;
  idsToOmit?: string[];
  fullWidth?: boolean;
}

export interface DashboardOption {
  label: string;
  value: string;
}

export function DashboardPicker({
  onChange,
  isDisabled = false,
  idsToOmit,
  fullWidth = false,
}: DashboardPickerProps) {
  const [dashboardOptions, setDashboardOptions] = useState<DashboardOption[]>(
    []
  );
  const [isLoadingDashboards, setIsLoadingDashboards] = useState(true);
  const [selectedDashboard, setSelectedDashboard] =
    useState<DashboardOption | null>(null);
  const [query, setQuery] = useState('');

  useFetcher(
    (callApmApi) => {
      // We don't want to manipulate the React state if the component has been unmounted
      // while we wait for the saved objects to return.
      let cleanedUp = false;

      const fetchDashboards = async () => {
        setIsLoadingDashboards(true);
        setDashboardOptions([]);
        const objects = await callApmApi(
          'GET /internal/apm/dashboards/search',
          {
            params: {
              query: {
                title: query ? `${query}*` : '',
              },
            },
          }
        );

        if (cleanedUp) {
          return;
        }

        if (objects) {
          setDashboardOptions(
            objects.dashboards
              .filter((d) => !idsToOmit || !idsToOmit.includes(d.id))
              .map((d) => ({
                value: d.id,
                label: d.title,
                'data-test-subj': `dashboard-picker-option-${d.title.replaceAll(
                  ' ',
                  '-'
                )}`,
              }))
          );
        }

        setIsLoadingDashboards(false);
      };

      fetchDashboards();

      return () => {
        cleanedUp = true;
      };
    },
    [query, idsToOmit]
  );

  return (
    <EuiComboBox
      data-test-subj="dashboardPickerInput"
      placeholder={i18n.translate(
        'presentationUtil.dashboardPicker.searchDashboardPlaceholder',
        {
          defaultMessage: 'Search dashboards...',
        }
      )}
      singleSelection={{ asPlainText: true }}
      options={dashboardOptions || []}
      selectedOptions={!!selectedDashboard ? [selectedDashboard] : undefined}
      onChange={(e) => {
        if (e.length) {
          setSelectedDashboard({ value: e[0].value || '', label: e[0].label });
          onChange({ label: e[0].label, value: e[0].value || '' });
        } else {
          setSelectedDashboard(null);
          onChange(null);
        }
      }}
      onSearchChange={setQuery}
      isDisabled={isDisabled}
      isLoading={isLoadingDashboards}
      compressed={true}
      fullWidth={fullWidth}
    />
  );
}
