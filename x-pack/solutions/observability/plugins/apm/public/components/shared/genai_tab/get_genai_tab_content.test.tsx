/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  GENAI_EBT_CLICK_ACTIONS,
  GENAI_TAB_IMPRESSION_EVENT_TYPE,
  type GenAiFields,
} from '@kbn/apm-ui-shared';
import { getGenAiTabContent } from './get_genai_tab_content';

const genAi: GenAiFields = {
  operationName: 'chat',
  requestModel: 'gpt-4o',
  provider: 'openai',
  requestParams: {},
  response: {},
  inputMessages: [],
  outputMessages: [],
};

describe('getGenAiTabContent', () => {
  it('returns undefined when the event has no gen_ai data', () => {
    expect(
      getGenAiTabContent({
        isGenAiSpan: false,
        genAi: undefined,
        ebt: { element: 'someTabs' },
        reportEvent: jest.fn(),
      })
    ).toBeUndefined();
  });

  it('includes the viewGenAi EBT click attributes for the provided surface element', () => {
    const tab = getGenAiTabContent({
      isGenAiSpan: true,
      genAi,
      ebt: { element: 'spanFlyoutTabs' },
      reportEvent: jest.fn(),
    });

    expect(tab).toMatchObject({
      id: 'genai',
      'data-test-subj': 'genAiTab',
      'data-ebt-action': GENAI_EBT_CLICK_ACTIONS.VIEW_GENAI,
      'data-ebt-element': 'spanFlyoutTabs',
    });
  });

  it('reports an impression for the provided surface element when the tab prepend renders', () => {
    const reportEvent = jest.fn();

    const tab = getGenAiTabContent({
      isGenAiSpan: true,
      genAi,
      ebt: { element: 'spanFlyoutTabs' },
      reportEvent,
      resourceId: 'span-1',
    });

    render(<>{tab?.prepend}</>);

    expect(reportEvent).toHaveBeenCalledWith(GENAI_TAB_IMPRESSION_EVENT_TYPE, {
      element: 'spanFlyoutTabs',
    });
  });
});
