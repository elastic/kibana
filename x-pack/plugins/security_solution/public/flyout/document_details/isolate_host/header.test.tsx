/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useIsolateHostPanelContext } from './context';
import { PanelHeader } from './header';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';

jest.mock('./context');

const renderPanelHeader = () =>
  render(
    <IntlProvider locale="en">
      <PanelHeader />
    </IntlProvider>
  );

describe('<PanelHeader />', () => {
  (useIsolateHostPanelContext as jest.Mock).mockReturnValue({ isolateAction: 'isolateHost' });

  it('should display isolate host message', () => {
    const { getByTestId } = renderPanelHeader();

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('Isolate host');
  });

  it('should display release host message', () => {
    (useIsolateHostPanelContext as jest.Mock).mockReturnValue({ isolateAction: 'unisolateHost' });

    const { getByTestId } = renderPanelHeader();

    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('Release host');
  });
});
