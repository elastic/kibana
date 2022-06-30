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
import { BrowserAdvancedFields } from './advanced_fields';
import {
  ConfigKey,
  BrowserAdvancedFields as BrowserAdvancedFieldsType,
  BrowserSimpleFields,
  Validation,
  DataStream,
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

describe('<BrowserAdvancedFields />', () => {
  const WrappedComponent = ({
    defaultValues = defaultConfig,
    defaultSimpleFields = defaultBrowserSimpleFields,
    validate = defaultValidation,
    children,
    onFieldBlur,
  }: {
    defaultValues?: BrowserAdvancedFieldsType;
    defaultSimpleFields?: BrowserSimpleFields;
    validate?: Validation;
    children?: React.ReactNode;
    onFieldBlur?: (field: ConfigKey) => void;
  }) => {
    return (
      <IntlProvider locale="en">
        <BrowserSimpleFieldsContextProvider defaultValues={defaultSimpleFields}>
          <BrowserAdvancedFieldsContextProvider defaultValues={defaultValues}>
            <BrowserAdvancedFields validate={validate} onFieldBlur={onFieldBlur}>
              {children}
            </BrowserAdvancedFields>
          </BrowserAdvancedFieldsContextProvider>
        </BrowserSimpleFieldsContextProvider>
      </IntlProvider>
    );
  };

  it('renders BrowserAdvancedFields', () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const syntheticsArgs = getByLabelText('Synthetics args');
    const screenshots = getByLabelText('Screenshot options') as HTMLInputElement;
    expect(screenshots.value).toEqual(defaultConfig[ConfigKey.SCREENSHOTS]);
    expect(syntheticsArgs).toBeInTheDocument();
  });

  describe('handles changing fields', () => {
    it('for screenshot options', () => {
      const { getByLabelText } = render(<WrappedComponent />);

      const screenshots = getByLabelText('Screenshot options') as HTMLInputElement;
      userEvent.selectOptions(screenshots, ['off']);
      expect(screenshots.value).toEqual('off');
    });

    it('calls onFieldBlur after change', () => {
      const onFieldBlur = jest.fn();
      const { getByLabelText } = render(<WrappedComponent onFieldBlur={onFieldBlur} />);

      const screenshots = getByLabelText('Screenshot options') as HTMLInputElement;
      userEvent.selectOptions(screenshots, ['off']);
      fireEvent.blur(screenshots);
      expect(onFieldBlur).toHaveBeenCalledWith(ConfigKey.SCREENSHOTS);
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
          [ConfigKey.SOURCE_ZIP_URL]: 'https://elastic.zip',
        }}
      />
    );

    expect(
      getByText(
        /Use these options to apply the selected monitor settings to a subset of the tests in your suite./
      )
    ).toBeInTheDocument();
  });

  it('renders upstream fields', () => {
    const upstreamFieldsText = 'Monitor Advanced field section';
    const { getByText } = render(<WrappedComponent>{upstreamFieldsText}</WrappedComponent>);

    const upstream = getByText(upstreamFieldsText) as HTMLInputElement;
    expect(upstream).toBeInTheDocument();
  });
});
