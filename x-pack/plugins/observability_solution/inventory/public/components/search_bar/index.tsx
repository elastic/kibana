/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { EntityTypesControls } from './entity_types_controls';

export function SearchBar() {
  const {
    dependencies: {
      start: { unifiedSearch },
    },
  } = useKibana();

  const { SearchBar: UnifiedSearchBar } = unifiedSearch.ui;

  return (
    <div>
      <UnifiedSearchBar
        appName="Inventory"
        showDatePicker={false}
        renderQueryInputAppend={EntityTypesControls}
      />
    </div>
  );
}
