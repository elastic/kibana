/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RESPONSE_SECTION_CONTENT_TEST_ID, RESPONSE_SECTION_HEADER_TEST_ID } from './test_ids';
import { RightPanelContext } from '../context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { ResponseSection } from './response_section';

const flyoutContextValue = {} as unknown as ExpandableFlyoutContext;
const panelContextValue = {} as unknown as RightPanelContext;

describe('<ResponseSection />', () => {
  it('should render the component collapsed', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <ResponseSection />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component expanded', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <ResponseSection expanded={true} />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(RESPONSE_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should expand the component when clicking on the arrow on header', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          <ResponseSection />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    );

    getByTestId(RESPONSE_SECTION_HEADER_TEST_ID).click();
    expect(getByTestId(RESPONSE_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});
