/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { EuiSearchBar, SearchFilterConfig } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AssignFlyoutSearchBarProps {
  onChange: (args: any) => void | boolean;
  isLoading: boolean;
  types: string[];
}

export const AssignFlyoutSearchBar: FC<AssignFlyoutSearchBarProps> = ({
  onChange,
  types,
  isLoading,
}) => {
  const filters = useMemo(() => {
    return [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate('xpack.savedObjectsTagging.assignFlyout.typeFilterName', {
          defaultMessage: 'Type',
        }),
        multiSelect: 'or',
        options: types.map((type) => ({
          value: type,
          name: type,
        })),
      } as SearchFilterConfig,
    ];
  }, [types]);

  return (
    <EuiSearchBar
      box={{
        'data-test-subj': 'assignFlyoutSearchBar',
        placeholder: i18n.translate('xpack.savedObjectsTagging.assignFlyout.searchPlaceholder', {
          defaultMessage: 'Search by saved object name',
        }),
        isLoading,
      }}
      onChange={onChange}
      filters={filters}
    />
  );
};
