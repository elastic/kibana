/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState, useCallback, useMemo } from 'react';
import { uniqBy } from 'lodash';
import { EuiFilterButton, EuiPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CustomComponentProps } from '@elastic/eui/src/components/search_bar/filters/custom_component_filter';
import { MlEntitySelector, type MlEntitySelectorProps } from '../../components/ml_entity_selector';

/**
 * Custom filter component to use with {@link EuiInMemoryTable}
 */
export const EntityFilter: FC<CustomComponentProps> = React.memo(({ query, onChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const hasActiveFilters = query.hasOrFieldClause('job_id') || query.hasSimpleFieldClause('job_id');
  const orFieldClause = query.getOrFieldClause('job_id');
  const simpleFieldClause = query.getSimpleFieldClause('job_id');

  const closePopover = setIsOpen.bind(null, false);

  const selectedOptions = useMemo(() => {
    let options: Exclude<MlEntitySelectorProps['selectedOptions'], undefined> = [];

    if (orFieldClause && Array.isArray(orFieldClause.value)) {
      options = orFieldClause.value.map((v) => ({ id: v as string }));
    }
    if (simpleFieldClause && simpleFieldClause.value) {
      options.push({ id: simpleFieldClause.value as string });
    }
    return options;
  }, [orFieldClause, simpleFieldClause]);

  const onSelectionChange = useCallback<
    Exclude<MlEntitySelectorProps['onSelectionChange'], undefined>
  >(
    (entitiesSelection) => {
      // first clean up
      let newQuery = query.removeOrFieldClauses('job_id');
      newQuery = newQuery.removeSimpleFieldClauses('job_id');

      if (entitiesSelection.length > 0) {
        newQuery = uniqBy(entitiesSelection, 'id').reduce((acc, curr) => {
          return acc.addOrFieldValue('job_id', curr.id, true, 'eq');
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
      numActiveFilters={hasActiveFilters ? selectedOptions.length : undefined}
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
        <MlEntitySelector
          selectedOptions={selectedOptions}
          onSelectionChange={onSelectionChange}
          handleDuplicates
        />
      </EuiPanel>
    </EuiPopover>
  );
});
