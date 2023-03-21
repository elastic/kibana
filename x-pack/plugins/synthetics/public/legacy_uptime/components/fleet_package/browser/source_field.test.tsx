/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'jest-canvas-mock';

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ConfigKey } from '../../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';
import { IPolicyConfigContextProvider } from '../contexts/policy_config_context';
import { SourceField, Props, defaultValues } from './source_field';
import { BrowserSimpleFieldsContextProvider, PolicyConfigContextProvider } from '../contexts';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility'),
  useGeneratedHtmlId: () => `id-${Math.random()}`,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        id={props.id}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

const onChange = jest.fn();
const onBlur = jest.fn();

describe('<SourceField />', () => {
  const WrappedComponent = ({
    isZipUrlSourceEnabled,
    defaultConfig,
  }: Omit<IPolicyConfigContextProvider, 'children'> & Partial<Props>) => {
    return (
      <PolicyConfigContextProvider isZipUrlSourceEnabled={isZipUrlSourceEnabled}>
        <BrowserSimpleFieldsContextProvider>
          <SourceField onChange={onChange} onFieldBlur={onBlur} defaultConfig={defaultConfig} />
        </BrowserSimpleFieldsContextProvider>
      </PolicyConfigContextProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onChange', async () => {
    render(<WrappedComponent />);
    const zipUrl = 'test.zip';

    const zip = screen.getByTestId('syntheticsSourceTab__zipUrl');
    fireEvent.click(zip);

    const zipUrlField = screen.getByTestId('syntheticsBrowserZipUrl');
    fireEvent.change(zipUrlField, { target: { value: zipUrl } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith({ ...defaultValues, zipUrl });
    });
  });

  it('calls onBlur', () => {
    render(<WrappedComponent />);

    const zip = screen.getByTestId('syntheticsSourceTab__zipUrl');
    fireEvent.click(zip);

    const zipUrlField = screen.getByTestId('syntheticsBrowserZipUrl');
    fireEvent.click(zipUrlField);
    fireEvent.blur(zipUrlField);

    expect(onBlur).toBeCalledWith(ConfigKey.SOURCE_ZIP_URL);
  });

  it('selects inline script by default', () => {
    render(<WrappedComponent />);

    expect(
      screen.getByText('Runs Synthetic test scripts that are defined inline.')
    ).toBeInTheDocument();
  });

  it('shows zip source type by default', async () => {
    render(<WrappedComponent />);

    expect(screen.getByTestId('syntheticsSourceTab__zipUrl')).toBeInTheDocument();
  });

  it('does not show ZipUrl source type when isZipUrlSourceEnabled = false', async () => {
    render(<WrappedComponent isZipUrlSourceEnabled={false} />);

    expect(screen.queryByTestId('syntheticsSourceTab__zipUrl')).not.toBeInTheDocument();
  });

  it('shows params for all source types', async () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);

    const inlineTab = getByTestId('syntheticsSourceTab__inline');
    fireEvent.click(inlineTab);

    expect(getByText('Parameters')).toBeInTheDocument();

    const recorder = getByTestId('syntheticsSourceTab__scriptRecorder');
    fireEvent.click(recorder);

    expect(getByText('Parameters')).toBeInTheDocument();

    const zip = getByTestId('syntheticsSourceTab__zipUrl');
    fireEvent.click(zip);

    expect(getByText('Parameters')).toBeInTheDocument();
  });

  it('shows deprecated for zip url', () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);

    const zip = getByTestId('syntheticsSourceTab__zipUrl');
    fireEvent.click(zip);

    expect(getByText('Zip URL is deprecated')).toBeInTheDocument();
  });
});
