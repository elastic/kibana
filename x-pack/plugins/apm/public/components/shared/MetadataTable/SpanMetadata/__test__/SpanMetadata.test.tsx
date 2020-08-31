/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SpanMetadata } from '..';
import { Span } from '../../../../../../typings/es_schemas/ui/span';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../../../utils/testHelpers';
import { MockApmPluginContextWrapper } from '../../../../../context/ApmPluginContext/MockApmPluginContext';

const renderOptions = {
  wrapper: MockApmPluginContextWrapper,
};

describe('SpanMetadata', () => {
  describe('render', () => {
    it('renders', () => {
      const span = ({
        agent: {
          ephemeral_id: 'ed8e3a4f-21d2-4a1f-bbc7-fa2064d94225',
          name: 'java',
          version: '1.9.1-SNAPSHOT',
        },
        service: {
          name: 'opbeans-java',
        },
        span: {
          id: '7efbc7056b746fcb',
          message: {
            age: { ms: 1577958057123 },
            queue: { name: 'queue name' },
          },
        },
      } as unknown) as Span;
      const output = render(<SpanMetadata span={span} />, renderOptions);
      expectTextsInDocument(output, ['Service', 'Agent', 'Message']);
    });
  });
  describe('when a span is presented', () => {
    it('renders the span', () => {
      const span = ({
        agent: {
          ephemeral_id: 'ed8e3a4f-21d2-4a1f-bbc7-fa2064d94225',
          name: 'java',
          version: '1.9.1-SNAPSHOT',
        },
        service: {
          name: 'opbeans-java',
        },
        span: {
          id: '7efbc7056b746fcb',
          http: {
            response: { status_code: 200 },
          },
          subtype: 'http',
          type: 'external',
          message: {
            age: { ms: 1577958057123 },
            queue: { name: 'queue name' },
          },
        },
      } as unknown) as Span;
      const output = render(<SpanMetadata span={span} />, renderOptions);
      expectTextsInDocument(output, ['Service', 'Agent', 'Span', 'Message']);
    });
  });
  describe('when there is no id inside span', () => {
    it('does not show the section', () => {
      const span = ({
        agent: {
          ephemeral_id: 'ed8e3a4f-21d2-4a1f-bbc7-fa2064d94225',
          name: 'java',
          version: '1.9.1-SNAPSHOT',
        },
        service: {
          name: 'opbeans-java',
        },
        span: {
          http: {
            response: { status_code: 200 },
          },
          subtype: 'http',
          type: 'external',
        },
      } as unknown) as Span;
      const output = render(<SpanMetadata span={span} />, renderOptions);
      expectTextsInDocument(output, ['Service', 'Agent']);
      expectTextsNotInDocument(output, ['Span', 'Message']);
    });
  });
});
