/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { MenuItem } from './menu_item';
import { createStateContainer } from '@kbn/kibana-utils-plugin/public';
import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';
import { EnhancedEmbeddable } from '@kbn/embeddable-enhanced-plugin/public';

test('<MenuItem/>', () => {
  const state = createStateContainer<{ events: object[] }>({ events: [] });
  const { getByText, queryByText } = render(
    <MenuItem
      context={{
        embeddable: {
          enhancements: {
            dynamicActions: { state } as unknown as DynamicActionManager,
          },
        } as unknown as EnhancedEmbeddable,
        trigger: {} as any,
      }}
    />
  );

  expect(getByText(/manage drilldowns/i)).toBeInTheDocument();
  expect(queryByText('0')).not.toBeInTheDocument();

  act(() => {
    state.set({ events: [{}] });
  });

  expect(queryByText('1')).toBeInTheDocument();
});
