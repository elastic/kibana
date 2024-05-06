/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TextHighlight } from './text_highlight';

describe('TextHighlight component', () => {
  it('should provide an acessible label for screen readers', async () => {
    const text = 'hello world';

    const renderResult = render(
      <TextHighlight text={text} match={[0, 1]} highlightStyle={{}}>
        <>
          <span>{text}</span>
        </>
      </TextHighlight>
    );

    expect(renderResult.queryByRole('document', { name: text })).toBeTruthy();
  });
});
