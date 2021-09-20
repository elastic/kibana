/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { BrowserAdvancedFields } from './advanced_fields';
import { ConfigKeys, IBrowserAdvancedFields } from '../types';
import {
  BrowserAdvancedFieldsContextProvider,
  defaultBrowserAdvancedFields as defaultConfig,
} from '../contexts';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<BrowserAdvancedFields />', () => {
  const WrappedComponent = ({ defaultValues }: { defaultValues?: IBrowserAdvancedFields }) => {
    return (
      <BrowserAdvancedFieldsContextProvider defaultValues={defaultValues}>
        <BrowserAdvancedFields />
      </BrowserAdvancedFieldsContextProvider>
    );
  };

  it('renders BrowserAdvancedFields', () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const syntheticsArgs = getByLabelText('Synthetics args');
    const screenshots = getByLabelText('Screenshot options') as HTMLInputElement;
    expect(screenshots.value).toEqual(defaultConfig[ConfigKeys.SCREENSHOTS]);
    expect(syntheticsArgs).toBeInTheDocument();
  });

  it('handles changing fields', () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const screenshots = getByLabelText('Screenshot options') as HTMLInputElement;

    fireEvent.change(screenshots, { target: { value: 'off' } });

    expect(screenshots.value).toEqual('off');
  });
});
