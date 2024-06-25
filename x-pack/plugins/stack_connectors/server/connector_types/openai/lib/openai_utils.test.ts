/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeRequest, getRequestWithStreamOption, removeEndpointFromUrl } from './openai_utils';
import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_CHAT_URL,
  OPENAI_LEGACY_COMPLETION_URL,
} from '../../../../common/openai/constants';

describe('Open AI Utils', () => {
  describe('sanitizeRequest', () => {
    it('sets stream to false when stream is set to true in the body', () => {
      const body = {
        model: 'gpt-4',
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      [OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(
          url,
          JSON.stringify(body),
          DEFAULT_OPENAI_MODEL
        );
        expect(sanitizedBodyString).toEqual(
          `{\"model\":\"gpt-4\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
        );
      });
    });

    it('sets stream to false when stream is not defined in the body', () => {
      const body = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      [OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(
          url,
          JSON.stringify(body),
          DEFAULT_OPENAI_MODEL
        );
        expect(sanitizedBodyString).toEqual(
          `{\"model\":\"gpt-4\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],\"stream\":false}`
        );
      });
    });

    it('sets stream to false when stream is set to false in the body', () => {
      const body = {
        model: 'gpt-4',
        stream: false,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      [OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(
          url,
          JSON.stringify(body),
          DEFAULT_OPENAI_MODEL
        );
        expect(sanitizedBodyString).toEqual(
          `{\"model\":\"gpt-4\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
        );
      });
    });

    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"model\":\"gpt-4\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;

      [OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL].forEach((url: string) => {
        const sanitizedBodyString = sanitizeRequest(url, bodyString, DEFAULT_OPENAI_MODEL);
        expect(sanitizedBodyString).toEqual(bodyString);
      });
    });

    it('does nothing when url does not accept stream parameter', () => {
      const bodyString = `{\"model\":\"gpt-4\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`;

      const sanitizedBodyString = sanitizeRequest(
        'https://randostring.ai',
        bodyString,
        DEFAULT_OPENAI_MODEL
      );
      expect(sanitizedBodyString).toEqual(bodyString);
    });
  });

  describe('getRequestWithStreamOption', () => {
    it('sets stream parameter when stream is not defined in the body', () => {
      const body = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      [OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(
          url,
          JSON.stringify(body),
          true,
          DEFAULT_OPENAI_MODEL
        );
        expect(sanitizedBodyString).toEqual(
          `{\"model\":\"gpt-4\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],\"stream\":true}`
        );
      });
    });

    it('overrides stream parameter if defined in body', () => {
      const body = {
        model: 'gpt-4',
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      [OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(
          url,
          JSON.stringify(body),
          false,
          DEFAULT_OPENAI_MODEL
        );
        expect(sanitizedBodyString).toEqual(
          `{\"model\":\"gpt-4\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
        );
      });
    });

    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"model\":\"gpt-4\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;

      [OPENAI_CHAT_URL, OPENAI_LEGACY_COMPLETION_URL].forEach((url: string) => {
        const sanitizedBodyString = getRequestWithStreamOption(
          url,
          bodyString,
          false,
          DEFAULT_OPENAI_MODEL
        );
        expect(sanitizedBodyString).toEqual(bodyString);
      });
    });

    it('does nothing when url does not accept stream parameter', () => {
      const bodyString = `{\"model\":\"gpt-4\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`;

      const sanitizedBodyString = getRequestWithStreamOption(
        'https://randostring.ai',
        bodyString,
        true,
        DEFAULT_OPENAI_MODEL
      );
      expect(sanitizedBodyString).toEqual(bodyString);
    });
  });
  describe('removeEndpointFromUrl', () => {
    test('removes "/chat/completions" from the end of the URL', () => {
      const originalUrl = 'https://api.openai.com/v1/chat/completions';
      const expectedUrl = 'https://api.openai.com/v1';
      expect(removeEndpointFromUrl(originalUrl)).toBe(expectedUrl);
    });

    test('does not modify the URL if it does not end with "/chat/completions"', () => {
      const originalUrl = 'https://api.openai.com/v1/some/other/endpoint';
      expect(removeEndpointFromUrl(originalUrl)).toBe(originalUrl);
    });

    test('handles URLs with a trailing slash correctly', () => {
      const originalUrl = 'https://api.openai.com/v1/chat/completions/';
      const expectedUrl = 'https://api.openai.com/v1';
      expect(removeEndpointFromUrl(originalUrl)).toBe(expectedUrl);
    });
  });
});
