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
import { ConfigKeys, IBrowserAdvancedFields, IBrowserSimpleFields } from '../types';
import {
  BrowserAdvancedFieldsContextProvider,
  BrowserSimpleFieldsContextProvider,
  defaultBrowserAdvancedFields as defaultConfig,
  defaultBrowserSimpleFields,
} from '../contexts';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<BrowserAdvancedFields />', () => {
  const WrappedComponent = ({
    defaultValues = defaultConfig,
    defaultSimpleFields = defaultBrowserSimpleFields,
  }: {
    defaultValues?: IBrowserAdvancedFields;
    defaultSimpleFields?: IBrowserSimpleFields;
  }) => {
    return (
      <BrowserSimpleFieldsContextProvider defaultValues={defaultSimpleFields}>
        <BrowserAdvancedFieldsContextProvider defaultValues={defaultValues}>
          <BrowserAdvancedFields />
        </BrowserAdvancedFieldsContextProvider>
      </BrowserSimpleFieldsContextProvider>
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

  it('only displayed filter options when zip url is truthy', () => {
    const { queryByText, getByText, rerender } = render(<WrappedComponent />);

    expect(
      queryByText(
        /Use these options to apply the selected monitor settings to a subset of the tests in your suite./
      )
    ).not.toBeInTheDocument();

    rerender(
      <WrappedComponent
        defaultSimpleFields={{
          ...defaultBrowserSimpleFields,
          [ConfigKeys.SOURCE_ZIP_URL]: 'https://elastic.zip',
        }}
      />
    );

    expect(
      getByText(
        /Use these options to apply the selected monitor settings to a subset of the tests in your suite./
      )
    ).toBeInTheDocument();
  });
});
