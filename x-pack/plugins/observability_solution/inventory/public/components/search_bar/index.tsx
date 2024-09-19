/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { EntityTypesControls } from './entity_types_controls';
import { useAdHocInventoryDataView } from '../../hooks/use_adhoc_inventory_data_view';

export function SearchBar() {
  const {
    dependencies: {
      start: { unifiedSearch },
    },
  } = useKibana();

  const { SearchBar: UnifiedSearchBar } = unifiedSearch.ui;

  const { dataView } = useAdHocInventoryDataView();

  return (
    <UnifiedSearchBar
      appName="Inventory"
      showDatePicker={false}
      indexPatterns={dataView ? [dataView] : undefined}
      renderQueryInputAppend={EntityTypesControls}
    />
  );
}
