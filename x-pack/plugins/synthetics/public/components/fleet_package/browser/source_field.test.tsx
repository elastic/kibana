/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'jest-canvas-mock';

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ConfigKey } from '../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';
import { IPolicyConfigContextProvider } from '../contexts/policy_config_context';
import { SourceField, defaultValues } from './source_field';
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
  }: Omit<IPolicyConfigContextProvider, 'children'>) => {
    return (
      <PolicyConfigContextProvider isZipUrlSourceEnabled={isZipUrlSourceEnabled}>
        <BrowserSimpleFieldsContextProvider>
          <SourceField onChange={onChange} onFieldBlur={onBlur} />
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

    const zipUrlField = screen.getByTestId('syntheticsBrowserZipUrl');
    fireEvent.change(zipUrlField, { target: { value: zipUrl } });

    await waitFor(() => {
      expect(onChange).toBeCalledWith({ ...defaultValues, zipUrl });
    });
  });

  it('calls onBlur', () => {
    render(<WrappedComponent />);

    const zipUrlField = screen.getByTestId('syntheticsBrowserZipUrl');
    fireEvent.click(zipUrlField);
    fireEvent.blur(zipUrlField);

    expect(onBlur).toBeCalledWith(ConfigKey.SOURCE_ZIP_URL);
  });

  it('shows ZipUrl source type by default', async () => {
    render(<WrappedComponent />);

    expect(screen.getByTestId('syntheticsSourceTab__zipUrl')).toBeInTheDocument();
  });

  it('does not show ZipUrl source type when isZipUrlSourceEnabled = false', async () => {
    render(<WrappedComponent isZipUrlSourceEnabled={false} />);

    expect(screen.queryByTestId('syntheticsSourceTab__zipUrl')).not.toBeInTheDocument();
  });
});
