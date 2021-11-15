/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../lib/helper/rtl_helpers';
import { BrowserAdvancedFields } from './advanced_fields';
import {
  ConfigKeys,
  DataStream,
  IBrowserAdvancedFields,
  IBrowserSimpleFields,
  Validation,
} from '../types';
import {
  BrowserAdvancedFieldsContextProvider,
  BrowserSimpleFieldsContextProvider,
  defaultBrowserAdvancedFields as defaultConfig,
  defaultBrowserSimpleFields,
} from '../contexts';
import { validate as centralValidation } from '../validation';
import { __IntlProvider as IntlProvider } from '@kbn/i18n/react';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

const defaultValidation = centralValidation[DataStream.BROWSER];

describe('<BrowserAdvancedFields />', () => {
  const WrappedComponent = ({
    defaultValues = defaultConfig,
    defaultSimpleFields = defaultBrowserSimpleFields,
    validate = defaultValidation,
  }: {
    defaultValues?: IBrowserAdvancedFields;
    defaultSimpleFields?: IBrowserSimpleFields;
    validate?: Validation;
  }) => {
    return (
      <IntlProvider locale="en">
        <BrowserSimpleFieldsContextProvider defaultValues={defaultSimpleFields}>
          <BrowserAdvancedFieldsContextProvider defaultValues={defaultValues}>
            <BrowserAdvancedFields validate={validate} />
          </BrowserAdvancedFieldsContextProvider>
        </BrowserSimpleFieldsContextProvider>
      </IntlProvider>
    );
  };

  it('renders BrowserAdvancedFields', () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const syntheticsArgs = getByLabelText('Synthetics args');
    const screenshots = getByLabelText('Screenshot options') as HTMLInputElement;
    const downloadSpeed = getByLabelText('Download Speed');
    const uploadSpeed = getByLabelText('Upload Speed');
    const latency = getByLabelText('Latency');

    expect(screenshots.value).toEqual(defaultConfig[ConfigKeys.SCREENSHOTS]);
    expect(syntheticsArgs).toBeInTheDocument();
    expect(downloadSpeed).toBeInTheDocument();
    expect(uploadSpeed).toBeInTheDocument();
    expect(latency).toBeInTheDocument();
  });

  describe('handles changing fields', () => {
    it('for screenshot options', () => {
      const { getByLabelText } = render(<WrappedComponent />);

      const screenshots = getByLabelText('Screenshot options') as HTMLInputElement;
      userEvent.selectOptions(screenshots, ['off']);
      expect(screenshots.value).toEqual('off');
    });

    it('for throttling options', () => {
      const { getByLabelText } = render(<WrappedComponent />);

      const downloadSpeed = getByLabelText('Download Speed') as HTMLInputElement;
      userEvent.clear(downloadSpeed);
      userEvent.type(downloadSpeed, '1337');
      expect(downloadSpeed.value).toEqual('1337');

      const uploadSpeed = getByLabelText('Upload Speed') as HTMLInputElement;
      userEvent.clear(uploadSpeed);
      userEvent.type(uploadSpeed, '1338');
      expect(uploadSpeed.value).toEqual('1338');

      const latency = getByLabelText('Latency') as HTMLInputElement;
      userEvent.clear(latency);
      userEvent.type(latency, '1339');
      expect(latency.value).toEqual('1339');
    });
  });

  describe('validates changing fields', () => {
    it('disallows negative/zero download speeds', () => {
      const { getByLabelText, queryByText } = render(<WrappedComponent />);

      const downloadSpeed = getByLabelText('Download Speed') as HTMLInputElement;
      userEvent.clear(downloadSpeed);
      userEvent.type(downloadSpeed, '-1337');
      expect(queryByText('Download speed must be greater than zero.')).toBeInTheDocument();

      userEvent.clear(downloadSpeed);
      userEvent.type(downloadSpeed, '0');
      expect(queryByText('Download speed must be greater than zero.')).toBeInTheDocument();

      userEvent.clear(downloadSpeed);
      userEvent.type(downloadSpeed, '1');
      expect(queryByText('Download speed must be greater than zero.')).not.toBeInTheDocument();
    });

    it('disallows negative/zero upload speeds', () => {
      const { getByLabelText, queryByText } = render(<WrappedComponent />);

      const uploadSpeed = getByLabelText('Upload Speed') as HTMLInputElement;
      userEvent.clear(uploadSpeed);
      userEvent.type(uploadSpeed, '-1337');
      expect(queryByText('Upload speed must be greater than zero.')).toBeInTheDocument();

      userEvent.clear(uploadSpeed);
      userEvent.type(uploadSpeed, '0');
      expect(queryByText('Upload speed must be greater than zero.')).toBeInTheDocument();

      userEvent.clear(uploadSpeed);
      userEvent.type(uploadSpeed, '1');
      expect(queryByText('Upload speed must be greater than zero.')).not.toBeInTheDocument();
    });

    it('disallows negative latency values', () => {
      const { getByLabelText, queryByText } = render(<WrappedComponent />);

      const latency = getByLabelText('Latency') as HTMLInputElement;
      userEvent.clear(latency);
      userEvent.type(latency, '-1337');
      expect(queryByText('Latency must not be negative.')).toBeInTheDocument();

      userEvent.clear(latency);
      userEvent.type(latency, '0');
      expect(queryByText('Latency must not be negative.')).not.toBeInTheDocument();

      userEvent.clear(latency);
      userEvent.type(latency, '1');
      expect(queryByText('Latency must not be negative.')).not.toBeInTheDocument();
    });
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
