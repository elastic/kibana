/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import React from 'react';
import type { CopyToClipboardProps } from './copy_to_clipboard';
import { CopyToClipboard } from './copy_to_clipboard';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

const renderShareButton = (props: CopyToClipboardProps) =>
  render(
    <IntlProvider locale="en">
      <CopyToClipboard {...props} />
    </IntlProvider>
  );

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the copy to clipboard button', () => {
    const text = 'text';

    const props = {
      rawValue: 'rawValue',
      text: <span>{text}</span>,
      iconType: 'iconType',
      ariaLabel: 'ariaLabel',
      'data-test-subj': 'data-test-subj',
    };
    const { getByTestId, getByText } = renderShareButton(props);

    const button = getByTestId('data-test-subj');

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', props.ariaLabel);
    expect(button).toHaveAttribute('type', 'button');

    expect(getByText(text)).toBeInTheDocument();
  });

  it('should use modifier if provided', () => {
    const modifiedFc = jest.fn();

    const props = {
      rawValue: 'rawValue',
      modifier: modifiedFc,
      text: <span>{'text'}</span>,
      iconType: 'iconType',
      ariaLabel: 'ariaLabel',
      'data-test-subj': 'data-test-subj',
    };
    const { getByTestId } = renderShareButton(props);

    const button = getByTestId('data-test-subj');

    button.click();

    expect(modifiedFc).toHaveBeenCalledWith(props.rawValue);
  });
});
