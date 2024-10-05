/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType, useMemo } from 'react';
import { EntitiesAppContextProvider } from '../public/components/entities_app_context_provider';
import { getMockEntitiesAppContext } from './get_mock_entities_app_context';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const context = useMemo(() => getMockEntitiesAppContext(), []);
  return (
    <EntitiesAppContextProvider context={context}>
      <Story />
    </EntitiesAppContextProvider>
  );
}
