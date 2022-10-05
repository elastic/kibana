/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useCallback } from 'react';
import { EuiFilterButton, EuiPanel, EuiPopover } from '@elastic/eui';
import type { CustomComponentProps } from '@elastic/eui/src/components/search_bar/filters/custom_component_filter';
import { MlEntitySelector, MlEntitySelectorProps } from './ml_entity_selector';

export const EntityFilter: FC<Required<CustomComponentProps>> = React.memo(
  ({ query, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const hasActiveFilters = query.hasOrFieldClause('job_id');
    const fieldClauses = query.getOrFieldClause('job_id');

    const numActiveFilters = Array.isArray(fieldClauses?.value)
      ? fieldClauses!.value.length
      : !!fieldClauses?.value
      ? 1
      : 0;

    const closePopover = () => {
      setIsOpen(false);
    };

    const onSelectionChange = useCallback<
      Exclude<MlEntitySelectorProps['onSelectionChange'], undefined>
    >(
      (entitiesSelection) => {
        const newQuery = entitiesSelection.reduce((acc, curr) => {
          return acc.addOrFieldValue('job_id', curr.id, true, 'eq');
        }, query);

        onChange(newQuery);
      },
      [onChange, query]
    );

    const button = (
      <EuiFilterButton
        iconType="arrowDown"
        iconSide="right"
        onClick={() => setIsOpen((prev) => !prev)}
        hasActiveFilters={hasActiveFilters}
        numActiveFilters={hasActiveFilters ? numActiveFilters : undefined}
        grow
      >
        Custom
      </EuiFilterButton>
    );

    return (
      <>
        <EuiPopover
          button={button}
          isOpen={isOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downCenter"
        >
          <EuiPanel paddingSize="s" css={{ width: '300px' }}>
            <MlEntitySelector onSelectionChange={onSelectionChange} />
          </EuiPanel>
        </EuiPopover>
      </>
    );
  }
);
