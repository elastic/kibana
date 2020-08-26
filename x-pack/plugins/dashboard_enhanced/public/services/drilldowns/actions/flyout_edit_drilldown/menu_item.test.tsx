/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, cleanup, act } from '@testing-library/react/pure';
import { MenuItem } from './menu_item';
import { createStateContainer } from '../../../../../../../../src/plugins/kibana_utils/public';
import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '../../../../../../ui_actions_enhanced/public';
import { EnhancedEmbeddable } from '../../../../../../embeddable_enhanced/public';

afterEach(cleanup);

test('<MenuItem/>', () => {
  const state = createStateContainer<{ events: object[] }>({ events: [] });
  const { getByText, queryByText } = render(
    <MenuItem
      context={{
        embeddable: ({
          enhancements: {
            dynamicActions: ({ state } as unknown) as DynamicActionManager,
          },
        } as unknown) as EnhancedEmbeddable,
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
