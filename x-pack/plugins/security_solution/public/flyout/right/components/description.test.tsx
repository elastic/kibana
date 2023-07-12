/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  DESCRIPTION_EXPAND_BUTTON_TEST_ID,
  DESCRIPTION_TITLE_TEST_ID,
  RULE_SUMMARY_BUTTON_TEST_ID,
} from './test_ids';
import {
  DOCUMENT_DESCRIPTION_COLLAPSE_BUTTON,
  DOCUMENT_DESCRIPTION_EXPAND_BUTTON,
  DOCUMENT_DESCRIPTION_TITLE,
  RULE_DESCRIPTION_TITLE,
} from './translations';
import { Description } from './description';
import { TestProviders } from '../../../common/mock';
import { RightPanelContext } from '../context';
import { ThemeProvider } from 'styled-components';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });

const ruleUuid = {
  category: 'kibana',
  field: 'kibana.alert.rule.uuid',
  values: ['123'],
  originalValue: ['123'],
  isObjectArray: false,
};
const ruleDescription = {
  category: 'kibana',
  field: 'kibana.alert.rule.description',
  values: [
    'This is a very long description of the rule. In theory. this description is long enough that it should be cut off when displayed in collapsed mode.',
  ],
  originalValue: ['description'],
  isObjectArray: false,
};
const ruleName = {
  category: 'kibana',
  field: 'kibana.alert.rule.name',
  values: ['rule-name'],
  originalValue: ['rule-name'],
  isObjectArray: false,
};

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/link_to');

describe('<Description />', () => {
  it('should render the component collapsed', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: [ruleUuid, ruleDescription, ruleName],
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThemeProvider theme={mockTheme}>
            <Description />
          </ThemeProvider>
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent(RULE_DESCRIPTION_TITLE);
    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_EXPAND_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_EXPAND_BUTTON_TEST_ID)).toHaveTextContent(
      DOCUMENT_DESCRIPTION_EXPAND_BUTTON
    );
  });

  it('should render the component expanded', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: [ruleUuid, ruleDescription, ruleName],
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThemeProvider theme={mockTheme}>
            <Description expanded={true} />
          </ThemeProvider>
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent(RULE_DESCRIPTION_TITLE);
    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_EXPAND_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_EXPAND_BUTTON_TEST_ID)).toHaveTextContent(
      DOCUMENT_DESCRIPTION_COLLAPSE_BUTTON
    );
  });

  it('should render expand and collapse when clicking on the button', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: [ruleUuid, ruleDescription, ruleName],
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThemeProvider theme={mockTheme}>
            <Description />
          </ThemeProvider>
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(DESCRIPTION_EXPAND_BUTTON_TEST_ID)).toHaveTextContent(
      DOCUMENT_DESCRIPTION_EXPAND_BUTTON
    );
    getByTestId(DESCRIPTION_EXPAND_BUTTON_TEST_ID).click();
    expect(getByTestId(DESCRIPTION_EXPAND_BUTTON_TEST_ID)).toHaveTextContent(
      DOCUMENT_DESCRIPTION_COLLAPSE_BUTTON
    );
  });

  it('should not render rule preview button if rule name is not available', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: [ruleUuid, ruleDescription],
    } as unknown as RightPanelContext;

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThemeProvider theme={mockTheme}>
            <Description />
          </ThemeProvider>
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent(RULE_DESCRIPTION_TITLE);
    expect(queryByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
  it('should render document title if document is not an alert', () => {
    const panelContextValue = {
      dataFormattedForFieldBrowser: [ruleDescription],
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThemeProvider theme={mockTheme}>
            <Description />
          </ThemeProvider>
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent(DOCUMENT_DESCRIPTION_TITLE);
  });
});
