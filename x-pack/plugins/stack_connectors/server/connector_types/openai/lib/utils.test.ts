/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeRequest, getRequestWithStreamOption, getAxiosOptions } from './utils';
import {
  DEFAULT_OPENAI_MODEL,
  OpenAiProviderType,
  OPENAI_CHAT_URL,
} from '../../../../common/openai/constants';
import {
  sanitizeRequest as openAiSanitizeRequest,
  getRequestWithStreamOption as openAiGetRequestWithStreamOption,
} from './openai_utils';
import {
  sanitizeRequest as azureAiSanitizeRequest,
  getRequestWithStreamOption as azureAiGetRequestWithStreamOption,
} from './azure_openai_utils';
import {
  sanitizeRequest as otherOpenAiSanitizeRequest,
  getRequestWithStreamOption as otherOpenAiGetRequestWithStreamOption,
} from './other_openai_utils';

jest.mock('./openai_utils');
jest.mock('./azure_openai_utils');
jest.mock('./other_openai_utils');

describe('Utils', () => {
  const azureAiUrl =
    'https://test.openai.azure.com/openai/deployments/abc/chat/completions?api-version=2023-06-01-preview';
  const bodyString = JSON.stringify({
    model: 'gpt-4',
    stream: true,
    messages: [
      {
        role: 'user',
        content: 'This is a test',
      },
    ],
  });
  describe('sanitizeRequest', () => {
    const mockOpenAiSanitizeRequest = openAiSanitizeRequest as jest.Mock;
    const mockAzureAiSanitizeRequest = azureAiSanitizeRequest as jest.Mock;
    const mockOtherOpenAiSanitizeRequest = otherOpenAiSanitizeRequest as jest.Mock;
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls openai_utils sanitizeRequest when provider is OpenAi', () => {
      sanitizeRequest(OpenAiProviderType.OpenAi, OPENAI_CHAT_URL, bodyString, DEFAULT_OPENAI_MODEL);
      expect(mockOpenAiSanitizeRequest).toHaveBeenCalledWith(
        OPENAI_CHAT_URL,
        bodyString,
        DEFAULT_OPENAI_MODEL
      );
      expect(mockAzureAiSanitizeRequest).not.toHaveBeenCalled();
      expect(mockOtherOpenAiSanitizeRequest).not.toHaveBeenCalled();
    });

    it('calls other_openai_utils sanitizeRequest when provider is Other OpenAi', () => {
      sanitizeRequest(OpenAiProviderType.Other, OPENAI_CHAT_URL, bodyString, DEFAULT_OPENAI_MODEL);
      expect(mockOtherOpenAiSanitizeRequest).toHaveBeenCalledWith(bodyString);
      expect(mockOpenAiSanitizeRequest).not.toHaveBeenCalled();
      expect(mockAzureAiSanitizeRequest).not.toHaveBeenCalled();
    });

    it('calls azure_openai_utils sanitizeRequest when provider is AzureAi', () => {
      sanitizeRequest(OpenAiProviderType.AzureAi, azureAiUrl, bodyString);
      expect(mockAzureAiSanitizeRequest).toHaveBeenCalledWith(azureAiUrl, bodyString);
      expect(mockOpenAiSanitizeRequest).not.toHaveBeenCalled();
      expect(mockOtherOpenAiSanitizeRequest).not.toHaveBeenCalled();
    });

    it('does not call any helper fns when provider is unrecognized', () => {
      sanitizeRequest('foo', OPENAI_CHAT_URL, bodyString);
      expect(mockOpenAiSanitizeRequest).not.toHaveBeenCalled();
      expect(mockAzureAiSanitizeRequest).not.toHaveBeenCalled();
      expect(mockOtherOpenAiSanitizeRequest).not.toHaveBeenCalled();
    });
  });

  describe('getRequestWithStreamOption', () => {
    const mockOpenAiGetRequestWithStreamOption = openAiGetRequestWithStreamOption as jest.Mock;
    const mockAzureAiGetRequestWithStreamOption = azureAiGetRequestWithStreamOption as jest.Mock;
    const mockOtherOpenAiGetRequestWithStreamOption =
      otherOpenAiGetRequestWithStreamOption as jest.Mock;
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls openai_utils getRequestWithStreamOption when provider is OpenAi', () => {
      getRequestWithStreamOption(
        OpenAiProviderType.OpenAi,
        OPENAI_CHAT_URL,
        bodyString,
        true,
        DEFAULT_OPENAI_MODEL
      );

      expect(mockOpenAiGetRequestWithStreamOption).toHaveBeenCalledWith(
        OPENAI_CHAT_URL,
        bodyString,
        true,
        DEFAULT_OPENAI_MODEL
      );
      expect(mockAzureAiGetRequestWithStreamOption).not.toHaveBeenCalled();
      expect(mockOtherOpenAiGetRequestWithStreamOption).not.toHaveBeenCalled();
    });

    it('calls other_openai_utils getRequestWithStreamOption when provider is Other OpenAi', () => {
      getRequestWithStreamOption(OpenAiProviderType.Other, OPENAI_CHAT_URL, bodyString, true);

      expect(mockOtherOpenAiGetRequestWithStreamOption).toHaveBeenCalledWith(bodyString, true);
      expect(mockOpenAiGetRequestWithStreamOption).not.toHaveBeenCalled();
      expect(mockAzureAiGetRequestWithStreamOption).not.toHaveBeenCalled();
    });

    it('calls azure_openai_utils getRequestWithStreamOption when provider is AzureAi', () => {
      getRequestWithStreamOption(OpenAiProviderType.AzureAi, azureAiUrl, bodyString, true);

      expect(mockAzureAiGetRequestWithStreamOption).toHaveBeenCalledWith(
        azureAiUrl,
        bodyString,
        true
      );
      expect(mockOpenAiGetRequestWithStreamOption).not.toHaveBeenCalled();
      expect(mockOtherOpenAiGetRequestWithStreamOption).not.toHaveBeenCalled();
    });

    it('does not call any helper fns when provider is unrecognized', () => {
      getRequestWithStreamOption(
        'foo' as unknown as OpenAiProviderType,
        OPENAI_CHAT_URL,
        bodyString,
        true
      );
      expect(mockOpenAiGetRequestWithStreamOption).not.toHaveBeenCalled();
      expect(mockAzureAiGetRequestWithStreamOption).not.toHaveBeenCalled();
      expect(mockOtherOpenAiGetRequestWithStreamOption).not.toHaveBeenCalled();
    });
  });

  describe('getAxiosOptions', () => {
    it('returns correct axios options when provider is openai and stream is false', () => {
      expect(getAxiosOptions(OpenAiProviderType.OpenAi, 'api-abc', false)).toEqual({
        headers: { Authorization: `Bearer api-abc`, ['content-type']: 'application/json' },
      });
    });

    it('returns correct axios options when provider is openai and stream is true', () => {
      expect(getAxiosOptions(OpenAiProviderType.OpenAi, 'api-abc', true)).toEqual({
        headers: { Authorization: `Bearer api-abc`, ['content-type']: 'application/json' },
        responseType: 'stream',
      });
    });

    it('returns correct axios options when provider is other openai and stream is false', () => {
      expect(getAxiosOptions(OpenAiProviderType.Other, 'api-abc', false)).toEqual({
        headers: { Authorization: `Bearer api-abc`, ['content-type']: 'application/json' },
      });
    });

    it('returns correct axios options when provider is other openai and stream is true', () => {
      expect(getAxiosOptions(OpenAiProviderType.Other, 'api-abc', true)).toEqual({
        headers: { Authorization: `Bearer api-abc`, ['content-type']: 'application/json' },
        responseType: 'stream',
      });
    });

    it('returns correct axios options when provider is azure openai and stream is false', () => {
      expect(getAxiosOptions(OpenAiProviderType.AzureAi, 'api-abc', false)).toEqual({
        headers: { ['api-key']: `api-abc`, ['content-type']: 'application/json' },
      });
    });

    it('returns correct axios options when provider is azure openai and stream is true', () => {
      expect(getAxiosOptions(OpenAiProviderType.AzureAi, 'api-abc', true)).toEqual({
        headers: { ['api-key']: `api-abc`, ['content-type']: 'application/json' },
        responseType: 'stream',
      });
    });

    it('returns empty options when provider is unrecognized', () => {
      expect(getAxiosOptions('foo', 'api-abc', true)).toEqual({ headers: {} });
    });
  });
});
