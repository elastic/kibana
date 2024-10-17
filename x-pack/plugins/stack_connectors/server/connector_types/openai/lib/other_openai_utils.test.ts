/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeRequest, getRequestWithStreamOption } from './other_openai_utils';

describe('Other (OpenAI Compatible Service) Utils', () => {
  describe('sanitizeRequest', () => {
    it('sets stream to false when stream is set to true in the body', () => {
      const body = {
        model: 'mistral',
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = sanitizeRequest(JSON.stringify(body));
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
      );
    });

    it('sets stream to false when stream is not defined in the body', () => {
      const body = {
        model: 'mistral',
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = sanitizeRequest(JSON.stringify(body));
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],\"stream\":false}`
      );
    });

    it('sets stream to false when stream is set to false in the body', () => {
      const body = {
        model: 'mistral',
        stream: false,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = sanitizeRequest(JSON.stringify(body));
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
      );
    });

    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;

      const sanitizedBodyString = sanitizeRequest(bodyString);
      expect(sanitizedBodyString).toEqual(bodyString);
    });
  });

  describe('getRequestWithStreamOption', () => {
    it('sets stream parameter when stream is not defined in the body', () => {
      const body = {
        model: 'mistral',
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = getRequestWithStreamOption(JSON.stringify(body), true);
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],\"stream\":true}`
      );
    });

    it('overrides stream parameter if defined in body', () => {
      const body = {
        model: 'mistral',
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = getRequestWithStreamOption(JSON.stringify(body), false);
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
      );
    });

    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;

      const sanitizedBodyString = getRequestWithStreamOption(bodyString, false);
      expect(sanitizedBodyString).toEqual(bodyString);
    });
  });
});
