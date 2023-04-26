/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  DESCRIPTION_SECTION_CONTENT_TEST_ID,
  DESCRIPTION_SECTION_HEADER_TEST_ID,
} from './test_ids';
import { DescriptionSection } from './description_section';
import { RightPanelContext } from '../context';

const panelContextValue = {} as unknown as RightPanelContext;

describe('<DescriptionSection />', () => {
  it('should render the component collapsed', () => {
    const { getByTestId } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <DescriptionSection />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(DESCRIPTION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
  });

  it('should render the component expanded', () => {
    const { getByTestId } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <DescriptionSection expanded={true} />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(DESCRIPTION_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });

  it('should expand the component when clicking on the arrow on header', () => {
    const { getByTestId } = render(
      <RightPanelContext.Provider value={panelContextValue}>
        <DescriptionSection />
      </RightPanelContext.Provider>
    );

    getByTestId(DESCRIPTION_SECTION_HEADER_TEST_ID).click();
    expect(getByTestId(DESCRIPTION_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});
