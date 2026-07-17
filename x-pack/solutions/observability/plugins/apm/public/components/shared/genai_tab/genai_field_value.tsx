/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiText } from '@elastic/eui';
import { Markdown } from '@kbn/shared-ux-markdown';
import React from 'react';
import { MaybeViewMore } from './view_more';

function tryParseJson(value: unknown): { parsed: unknown; isJson: boolean } {
  if (typeof value === 'object' && value !== null) {
    return { parsed: value, isJson: true };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return { parsed: JSON.parse(trimmed), isJson: true };
      } catch {
        // not JSON
      }
    }
  }
  return { parsed: value, isJson: false };
}

interface Props {
  value: unknown;
}

/** Renders a gen_ai field value: prettified JSON, markdown, or plain text. */
export function GenAiFieldValue({ value }: Props) {
  const { parsed, isJson } = tryParseJson(value);

  if (isJson) {
    const str = JSON.stringify(parsed, null, 2);
    return (
      <MaybeViewMore content={str}>
        <EuiCodeBlock language="json" paddingSize="m" fontSize="s" isCopyable overflowHeight={300}>
          {str}
        </EuiCodeBlock>
      </MaybeViewMore>
    );
  }

  const str = String(value ?? '');

  if (str.includes('\n') || str.includes('**') || str.includes('`') || str.includes('#')) {
    return (
      <MaybeViewMore content={str}>
        <Markdown readOnly>{str}</Markdown>
      </MaybeViewMore>
    );
  }

  return (
    <MaybeViewMore content={str}>
      <EuiText size="s">
        <span>{str}</span>
      </EuiText>
    </MaybeViewMore>
  );
}
