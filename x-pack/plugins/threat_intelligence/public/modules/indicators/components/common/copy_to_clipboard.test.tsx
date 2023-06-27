/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  CopyToClipboardButtonEmpty,
  CopyToClipboardButtonIcon,
  CopyToClipboardContextMenu,
} from './copy_to_clipboard';

const mockValue: string = 'Text copied';
const TEST_ID: string = 'test';

describe('<CopyToClipboardButtonEmpty /> <CopyToClipboardContextMenu /> <CopyToClipboardButtonIcon />', () => {
  it('should render one EuiButtonEmtpy', () => {
    const { getByTestId, getAllByText } = render(
      <CopyToClipboardButtonEmpty value={mockValue} data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonEmpty');
    expect(getAllByText('Copy to clipboard')).toHaveLength(1);
  });

  it('should render one EuiContextMenuItem (for EuiContextMenu use)', () => {
    const { getByTestId, getAllByText } = render(
      <CopyToClipboardContextMenu value={mockValue} data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TEST_ID)).toHaveClass('euiContextMenuItem');
    expect(getAllByText('Copy to clipboard')).toHaveLength(1);
  });

  it('should render one EuibuttonIcon', () => {
    const { getByTestId } = render(
      <CopyToClipboardButtonIcon value={mockValue} data-test-subj={TEST_ID} />
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TEST_ID)).toHaveClass('euiButtonIcon');
  });
});
