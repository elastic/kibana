/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RightPanelContext } from '../context';
import { JsonTab } from './json_tab';
import { JSON_TAB_ERROR_TEST_ID, JSON_TAB_CONTENT_TEST_ID } from './test_ids';

describe('<JsonTab />', () => {
  it('should render code block component', () => {
    const contextValue = {
      searchHit: {
        some_field: 'some_value',
      },
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <RightPanelContext.Provider value={contextValue}>
        <JsonTab />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(JSON_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should render error message on invalid searchHit', () => {
    const contextValue = {
      searchHit: null,
    } as unknown as RightPanelContext;

    const { getByTestId, getByText } = render(
      <RightPanelContext.Provider value={contextValue}>
        <JsonTab />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(JSON_TAB_ERROR_TEST_ID)).toBeInTheDocument();
    expect(getByText('Unable to display document information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the document fields and values')
    ).toBeInTheDocument();
  });
});
