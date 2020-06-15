/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { EuiFilterButton } from '@elastic/eui';
import { FilterPopover } from '../../../../../uptime/public';
import { useLocalUIFilters } from '../../../hooks/useLocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';

interface Props {
  fieldName: string;
}

export const BreakdownFilter = ({ fieldName }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionUrl', 'location', 'device', 'os', 'browser'],
      projection: PROJECTION.RUM_OVERVIEW,
    };

    return config;
  }, []);

  const { filters } = useLocalUIFilters(localUIFiltersConfig);

  const items = [];

  filters.forEach(({ options }) => {
    options.forEach(({ name }) => {
      items.push(name);
    });
  });

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={() => setIsOpen(!isOpen)}
      isSelected={isOpen}
      numFilters={items.length}
      hasActiveFilters={true}
      numActiveFilters={2}
      withNext={false}
    >
      Breakdown
    </EuiFilterButton>
  );

  return (
    <FilterPopover
      fieldName={fieldName}
      id={fieldName}
      items={items}
      loading={false}
      onFilterFieldChange={() => {}}
      selectedItems={[]}
      title={''}
      btnContent={button}
      forceOpen={isOpen}
      setForceOpen={() => {
        setIsOpen(!isOpen);
      }}
    />
  );
};
