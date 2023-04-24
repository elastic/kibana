/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { buildMetadataFilter } from './build_metadata_filter';
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';

interface AddMetadataFilterButtonProps {
  item: {
    name: string;
    value: string | string[] | undefined;
  };
}

const filterAddedToastTitle = i18n.translate(
  'xpack.infra.hostsViewPage.flyout.metadata.filterAdded',
  {
    defaultMessage: 'Filter was added',
  }
);

export const AddMetadataFilterButton = ({ item }: AddMetadataFilterButtonProps) => {
  const { dataView } = useMetricsDataViewContext();
  const { searchCriteria } = useUnifiedSearchContext();

  const {
    services: {
      data: {
        query: { filterManager: filterManagerService },
      },
      notifications: { toasts: toastsService },
      telemetry,
    },
  } = useKibanaContextForPlugin();

  const existingFilter = useMemo(
    () => searchCriteria.filters.find((filter) => filter.meta.key === item.name),
    [item.name, searchCriteria.filters]
  );

  const handleAddFilter = () => {
    const newFilter = buildMetadataFilter({
      field: item.name,
      value: item.value ?? '',
      dataView,
      negate: false,
    });
    if (newFilter) {
      telemetry.reportHostFlyoutFilterAdded({
        field_name: item.name,
      });
      filterManagerService.addFilters(newFilter);
      toastsService.addSuccess({
        title: filterAddedToastTitle,
        toastLifeTimeMs: 10000,
      });
    }
  };

  if (existingFilter) {
    return (
      <span>
        <EuiToolTip
          content={i18n.translate(
            'xpack.infra.hostsViewPage.flyout.metadata.setRemoveFilterTooltip',
            {
              defaultMessage: 'Remove filter',
            }
          )}
        >
          <EuiButtonIcon
            size="s"
            color="text"
            iconType="filter"
            display="base"
            data-test-subj="hostsView-flyout-metadata-remove-filter"
            aria-label={i18n.translate(
              'xpack.infra.hostsViewPage.flyout.metadata.filterAriaLabel',
              {
                defaultMessage: 'Filter',
              }
            )}
            onClick={() => {
              telemetry.reportHostFlyoutFilterRemoved({
                field_name: existingFilter.meta.key!,
              });
              filterManagerService.removeFilter(existingFilter);
            }}
          />
        </EuiToolTip>
      </span>
    );
  }

  return (
    <span>
      <EuiToolTip
        content={i18n.translate(
          'xpack.infra.hostsViewPage.flyout.metadata.setFilterByValueTooltip',
          {
            defaultMessage: 'Filter by value',
          }
        )}
      >
        <EuiButtonIcon
          color="primary"
          size="s"
          iconType="filter"
          data-test-subj="hostsView-flyout-metadata-add-filter"
          aria-label={i18n.translate(
            'xpack.infra.hostsViewPage.flyout.metadata.AddFilterAriaLabel',
            {
              defaultMessage: 'Add Filter',
            }
          )}
          onClick={handleAddFilter}
        />
      </EuiToolTip>
    </span>
  );
};
