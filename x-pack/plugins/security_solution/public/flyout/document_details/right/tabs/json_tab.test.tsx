/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RightPanelContext } from '../context';
import { JsonTab } from './json_tab';
import { JSON_TAB_CONTENT_TEST_ID, JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID } from './test_ids';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

const searchHit = {
  some_field: 'some_value',
};
const contextValue = {
  searchHit,
} as unknown as RightPanelContext;

const renderJsonTab = () =>
  render(
    <IntlProvider locale="en">
      <RightPanelContext.Provider value={contextValue}>
        <JsonTab />
      </RightPanelContext.Provider>
    </IntlProvider>
  );

describe('<JsonTab />', () => {
  it('should render json code editor component', () => {
    const { getByTestId } = renderJsonTab();

    expect(getByTestId(JSON_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should copy to clipboard', () => {
    const { getByTestId } = renderJsonTab();

    const copyToClipboardButton = getByTestId(JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID);
    expect(copyToClipboardButton).toBeInTheDocument();
  });
});
