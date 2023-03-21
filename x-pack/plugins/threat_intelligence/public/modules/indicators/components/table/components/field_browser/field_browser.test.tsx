/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockedTriggersActionsUiService,
  TestProvidersComponent,
} from '../../../../../../common/mocks/test_providers';
import { render } from '@testing-library/react';
import React from 'react';
import { IndicatorsFieldBrowser } from '.';

const stub = jest.fn();

describe('<IndicatorsFieldBrowser />', () => {
  it('should retrieve the field browser widget from respective service', () => {
    render(
      <IndicatorsFieldBrowser
        browserFields={{}}
        columnIds={[]}
        onResetColumns={stub}
        onToggleColumn={stub}
      />,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(mockedTriggersActionsUiService.getFieldBrowser).toHaveBeenCalledTimes(1);
    expect(mockedTriggersActionsUiService.getFieldBrowser).toHaveBeenCalledWith(
      expect.objectContaining({
        browserFields: {},
        columnIds: [],
        onResetColumns: stub,
        onToggleColumn: stub,
        options: {
          preselectedCategoryIds: ['threat', 'base', 'event', 'agent'],
        },
      })
    );
  });
});
