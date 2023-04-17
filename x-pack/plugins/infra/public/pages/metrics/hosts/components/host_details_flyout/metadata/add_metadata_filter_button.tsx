/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { Filter, PhraseFilter, PhrasesFilter, ScriptedPhraseFilter } from '@kbn/es-query';
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
  const [existingFilter, setExistingFilter] = useState<
    PhrasesFilter | PhraseFilter | ScriptedPhraseFilter | Filter | undefined
  >(() => undefined);
  const {
    services: {
      data: {
        query: { filterManager: filterManagerService },
      },
      notifications: { toasts: toastsService },
    },
  } = useKibanaContextForPlugin();

  useMemo(() => {
    const addedFilter = searchCriteria.filters.find((filter) => filter.meta.key === item.name);
    if (addedFilter) {
      setExistingFilter(addedFilter);
    }
  }, [item.name, searchCriteria.filters]);

  if (existingFilter) {
    return (
      <span>
        <EuiToolTip
          content={i18n.translate('xpack.infra.hostsViewPage.flyout.metadata.setFilterTooltip', {
            defaultMessage: 'Remove filter',
          })}
        >
          <EuiButtonIcon
            color="primary"
            size="s"
            iconType="filter"
            aria-label={i18n.translate(
              'xpack.infra.hostsViewPage.flyout.metadata.filterAriaLabel',
              {
                defaultMessage: 'Filter',
              }
            )}
            onClick={() => filterManagerService.removeFilter(existingFilter)}
          />
        </EuiToolTip>
      </span>
    );
  }

  return (
    <span className="euiTableCellContent__hoverItem expandedItemActions__completelyHide">
      <EuiToolTip
        content={i18n.translate('xpack.infra.hostsViewPage.flyout.metadata.setFilterTooltip', {
          defaultMessage: 'View event with filter',
        })}
      >
        <EuiButtonIcon
          color="text"
          size="s"
          iconType="filter"
          aria-label={i18n.translate('xpack.infra.hostsViewPage.flyout.metadata.filterAriaLabel', {
            defaultMessage: 'Add Filter',
          })}
          onClick={() => {
            const newFilter = buildMetadataFilter({
              field: item.name,
              value: item.value ?? '',
              dataView,
              negate: false,
            });
            if (newFilter) {
              filterManagerService.addFilters(newFilter);
              toastsService.addSuccess({
                title: filterAddedToastTitle,
                toastLifeTimeMs: 10000,
              });
            }
          }}
        />
      </EuiToolTip>
    </span>
  );
};
