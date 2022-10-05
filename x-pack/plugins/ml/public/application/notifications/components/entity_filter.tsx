/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useCallback } from 'react';
import { uniqBy } from 'lodash';
import { EuiFilterButton, EuiPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CustomComponentProps } from '@elastic/eui/src/components/search_bar/filters/custom_component_filter';
import { MlEntitySelector, MlEntitySelectorProps } from './ml_entity_selector';

/**
 * Custom filter component to use with {@link EuiInMemoryTable}
 */
export const EntityFilter: FC<CustomComponentProps> = React.memo(({ query, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = query.hasOrFieldClause('job_id') || query.hasSimpleFieldClause('job_id');
  const fieldClauses = query.getOrFieldClause('job_id');

  const numActiveFilters = Array.isArray(fieldClauses?.value)
    ? fieldClauses!.value.length
    : !!fieldClauses?.value
    ? 1
    : 0;

  const closePopover = setIsOpen.bind(null, false);

  const selectedOptions = (
    Array.isArray(fieldClauses?.value) ? fieldClauses!.value : []
  ) as MlEntitySelectorProps['selectedOptions'];

  const onSelectionChange = useCallback<
    Exclude<MlEntitySelectorProps['onSelectionChange'], undefined>
  >(
    (entitiesSelection) => {
      // first clean up
      let newQuery = query.removeOrFieldClauses('job_id');
      newQuery = newQuery.removeSimpleFieldClauses('job_id');

      if (entitiesSelection.length > 0) {
        newQuery = uniqBy(entitiesSelection, 'value').reduce((acc, curr) => {
          return acc.addOrFieldValue('job_id', curr.value, true, 'eq');
        }, newQuery);
      }

      onChange!(newQuery);
    },
    [onChange, query]
  );

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      iconSide="right"
      onClick={setIsOpen.bind(null, (prev) => !prev)}
      hasActiveFilters={hasActiveFilters}
      numActiveFilters={hasActiveFilters ? numActiveFilters : undefined}
      grow
    >
      <FormattedMessage id="xpack.ml.notifications.entityFilter" defaultMessage="Entity" />
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiPanel paddingSize="s" css={{ width: '300px' }}>
        <MlEntitySelector selectedOptions={selectedOptions} onSelectionChange={onSelectionChange} />
      </EuiPanel>
    </EuiPopover>
  );
});
