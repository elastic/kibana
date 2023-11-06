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
import { EuiButtonEmpty } from '@elastic/eui';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

const renderShareButton = (props: CopyToClipboardProps) =>
  render(
    <IntlProvider locale="en">
      <CopyToClipboard {...props}>
        <EuiButtonEmpty iconType={'copyClipboard'} aria-label={'Copy'} data-test-subj={'children'}>
          {'Copy'}
        </EuiButtonEmpty>
      </CopyToClipboard>
    </IntlProvider>
  );

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the children element', () => {
    const props = {
      rawValue: 'rawValue',
      'data-test-subj': 'data-test-subj',
    };
    const { getByTestId } = renderShareButton(props);

    const button = getByTestId('data-test-subj');
    const children = getByTestId('children');

    expect(button).toBeInTheDocument();
    expect(children).toBeInTheDocument();
  });

  it('should use modifier if provided', () => {
    const modifiedFc = jest.fn();

    const props = {
      rawValue: 'rawValue',
      modifier: modifiedFc,
      'data-test-subj': 'data-test-subj',
    };
    const { getByTestId } = renderShareButton(props);

    const button = getByTestId('data-test-subj');

    button.click();

    expect(modifiedFc).toHaveBeenCalledWith(props.rawValue);
  });
});
