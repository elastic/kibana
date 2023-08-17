/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { UseAssistantParams, UseAssistantResult } from './use_assistant';
import { useAssistant } from './use_assistant';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_context';
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';

jest.mock('../../../assistant/use_assistant_availability');
jest.mock('@kbn/elastic-assistant');

const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;
const isAlert = true;

const renderUseAssistant = () =>
  renderHook((props: UseAssistantParams) => useAssistant(props), {
    initialProps: { dataFormattedForFieldBrowser, isAlert },
  });

describe('useAssistant', () => {
  let hookResult: RenderHookResult<UseAssistantParams, UseAssistantResult>;

  it(`should return showAssistant true and a value for promptContextId`, () => {
    jest
      .mocked(useAssistantAvailability)
      .mockReturnValue({ hasAssistantPrivilege: true, isAssistantEnabled: true });
    jest
      .mocked(useAssistantOverlay)
      .mockReturnValue({ showAssistantOverlay: jest.fn, promptContextId: '123' });

    hookResult = renderUseAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(true);
    expect(hookResult.result.current.promptContextId).toEqual('123');
  });

  it(`should return showAssistant false if hasAssistantPrivilege is false`, () => {
    jest
      .mocked(useAssistantAvailability)
      .mockReturnValue({ hasAssistantPrivilege: false, isAssistantEnabled: true });
    jest
      .mocked(useAssistantOverlay)
      .mockReturnValue({ showAssistantOverlay: jest.fn, promptContextId: '123' });

    hookResult = renderUseAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
    expect(hookResult.result.current.promptContextId).toEqual('');
  });
});
