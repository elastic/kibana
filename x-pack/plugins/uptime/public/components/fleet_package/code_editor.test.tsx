/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'jest-canvas-mock';

import React, { useState, useCallback } from 'react';
import { fireEvent, waitFor, screen } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { CodeEditor } from './code_editor';
import { Mode } from './types';

describe.skip('<RequestBodyField />', () => {
  const languageId = 'javascript';
  const onChange = jest.fn();
  const defaultValue = 'sample value';

  it('renders RequestBodyField', () => {
    const value = 'const x = y';
    render(<CodeEditor languageId={languageId} onChange={onChange} />);

    const textarea = screen.getByLabelText(
      'Editor content;Press Alt+F1 for Accessibility Options.'
    );

    fireEvent.change(textarea, { target: { value } });

    expect(onChange).toBeCalledWith(value);
  });

  it('handles fires onChange when code editor is changed', async () => {
    const value = 'const x = y';
    const { getByText, getByLabelText, queryByText, queryByLabelText } = render(
      <CodeEditor languageId={languageId} />
    );

    // currently text code editor is displayed
    const textarea = getByLabelText('Editor content;Press Alt+F1 for Accessibility Options.');
    expect(queryByText('Key')).not.toBeInTheDocument();

    fireEvent.change(textarea, { target: { value } });

    screen.debug();

    await waitFor(() => {
      expect(onChange).toBeCalledWith(value);
    });
  });
});
