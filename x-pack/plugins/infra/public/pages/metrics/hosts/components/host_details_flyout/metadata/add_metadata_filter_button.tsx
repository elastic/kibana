/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { compareFilters, COMPARE_ALL_OPTIONS } from '@kbn/es-query';
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

export const AddMetadataFilterButton = ({ item }: AddMetadataFilterButtonProps) => {
  const { dataView } = useMetricsDataViewContext();
  const { searchCriteria } = useUnifiedSearchContext();
  const {
    services: {
      data: {
        query: { filterManager: filterManagerService },
      },
    },
  } = useKibanaContextForPlugin();

  return (
    <span>
      <EuiToolTip
        content={i18n.translate('xpack.infra.nodeDetails.tabs.metadata.setFilterTooltip', {
          defaultMessage: 'View event with filter',
        })}
      >
        <EuiButtonIcon
          color="text"
          size="s"
          iconType="filter"
          aria-label={i18n.translate('xpack.infra.nodeDetails.tabs.metadata.filterAriaLabel', {
            defaultMessage: 'Filter',
          })}
          onClick={() => {
            if (dataView) {
              const filter = buildMetadataFilter({
                field: item.name,
                value: item.value ?? '',
                dataView,
                negate: false,
              });
              if (!compareFilters(searchCriteria.filters, filter, COMPARE_ALL_OPTIONS)) {
                filterManagerService.addFilters(filter);
              }
            }
          }}
        />
      </EuiToolTip>
    </span>
  );
};
