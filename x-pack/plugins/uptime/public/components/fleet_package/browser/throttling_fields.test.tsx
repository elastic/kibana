/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../lib/helper/rtl_helpers';
import { ThrottlingFields } from './throttling_fields';
import {
  DataStream,
  BrowserAdvancedFields,
  BrowserSimpleFields,
  Validation,
  ConfigKey,
} from '../types';
import {
  BrowserAdvancedFieldsContextProvider,
  BrowserSimpleFieldsContextProvider,
  defaultBrowserAdvancedFields as defaultConfig,
  defaultBrowserSimpleFields,
} from '../contexts';
import { validate as centralValidation } from '../validation';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const defaultValidation = centralValidation[DataStream.BROWSER];

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<ThrottlingFields />', () => {
  const WrappedComponent = ({
    defaultValues = defaultConfig,
    defaultSimpleFields = defaultBrowserSimpleFields,
    validate = defaultValidation,
    onFieldBlur,
  }: {
    defaultValues?: BrowserAdvancedFields;
    defaultSimpleFields?: BrowserSimpleFields;
    validate?: Validation;
    onFieldBlur?: (field: ConfigKey) => void;
  }) => {
    return (
      <IntlProvider locale="en">
        <BrowserSimpleFieldsContextProvider defaultValues={defaultSimpleFields}>
          <BrowserAdvancedFieldsContextProvider defaultValues={defaultValues}>
            <ThrottlingFields validate={validate} onFieldBlur={onFieldBlur} />
          </BrowserAdvancedFieldsContextProvider>
        </BrowserSimpleFieldsContextProvider>
      </IntlProvider>
    );
  };

  it('renders ThrottlingFields', () => {
    const { getByLabelText, getByTestId } = render(<WrappedComponent />);

    const enableSwitch = getByTestId('syntheticsBrowserIsThrottlingEnabled');
    const downloadSpeed = getByLabelText('Download Speed');
    const uploadSpeed = getByLabelText('Upload Speed');
    const latency = getByLabelText('Latency');

    expect(enableSwitch).toBeChecked();
    expect(downloadSpeed).toBeInTheDocument();
    expect(uploadSpeed).toBeInTheDocument();
    expect(latency).toBeInTheDocument();
  });

  describe('handles changing fields', () => {
    it('for the enable switch', () => {
      const { getByTestId } = render(<WrappedComponent />);

      const enableSwitch = getByTestId('syntheticsBrowserIsThrottlingEnabled');
      userEvent.click(enableSwitch);
      expect(enableSwitch).not.toBeChecked();
    });

    it('for the download option', () => {
      const { getByLabelText } = render(<WrappedComponent />);

      const downloadSpeed = getByLabelText('Download Speed') as HTMLInputElement;
      userEvent.clear(downloadSpeed);
      userEvent.type(downloadSpeed, '1337');
      expect(downloadSpeed.value).toEqual('1337');
    });

    it('for the upload option', () => {
      const { getByLabelText } = render(<WrappedComponent />);

      const uploadSpeed = getByLabelText('Upload Speed') as HTMLInputElement;
      userEvent.clear(uploadSpeed);
      userEvent.type(uploadSpeed, '1338');
      expect(uploadSpeed.value).toEqual('1338');
    });

    it('for the latency option', () => {
      const { getByLabelText } = render(<WrappedComponent />);
      const latency = getByLabelText('Latency') as HTMLInputElement;
      userEvent.clear(latency);
      userEvent.type(latency, '1339');
      expect(latency.value).toEqual('1339');
    });
  });

  describe('calls onBlur on fields', () => {
    const onFieldBlur = jest.fn();

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('for the enable switch', () => {
      const { getByTestId } = render(<WrappedComponent onFieldBlur={onFieldBlur} />);

      const enableSwitch = getByTestId('syntheticsBrowserIsThrottlingEnabled');
      fireEvent.focus(enableSwitch);
      fireEvent.blur(enableSwitch);
      expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.IS_THROTTLING_ENABLED);
    });

    it('for throttling inputs', () => {
      const { getByLabelText } = render(<WrappedComponent onFieldBlur={onFieldBlur} />);

      const downloadSpeed = getByLabelText('Download Speed') as HTMLInputElement;
      const uploadSpeed = getByLabelText('Upload Speed') as HTMLInputElement;
      const latency = getByLabelText('Latency') as HTMLInputElement;

      fireEvent.blur(downloadSpeed);
      fireEvent.blur(uploadSpeed);
      fireEvent.blur(latency);

      expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.DOWNLOAD_SPEED);
      expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.UPLOAD_SPEED);
      expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.LATENCY);
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

  it('only displays download, upload, and latency fields with throttling is on', () => {
    const { getByLabelText, getByTestId } = render(<WrappedComponent />);

    const enableSwitch = getByTestId('syntheticsBrowserIsThrottlingEnabled');
    const downloadSpeed = getByLabelText('Download Speed');
    const uploadSpeed = getByLabelText('Upload Speed');
    const latency = getByLabelText('Latency');

    expect(downloadSpeed).toBeInTheDocument();
    expect(uploadSpeed).toBeInTheDocument();
    expect(latency).toBeInTheDocument();

    userEvent.click(enableSwitch);

    expect(downloadSpeed).not.toBeInTheDocument();
    expect(uploadSpeed).not.toBeInTheDocument();
    expect(latency).not.toBeInTheDocument();
  });
});
