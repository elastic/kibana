/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'jest-canvas-mock';

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { IPolicyConfigContextProvider } from '../contexts/policy_config_context';
import { SourceField, Props } from './source_field';
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
      <>
        <input
          data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
          data-currentvalue={props.value}
          id={props.id}
          onChange={props.onChange}
        />
      </>
    ),
  };
});

const onChange = jest.fn();
const onBlur = jest.fn();

describe('<SourceField />', () => {
  const WrappedComponent = ({
    defaultConfig,
  }: Omit<IPolicyConfigContextProvider, 'children'> & Partial<Props>) => {
    return (
      <PolicyConfigContextProvider>
        <BrowserSimpleFieldsContextProvider>
          <SourceField onChange={onChange} onFieldBlur={onBlur} defaultConfig={defaultConfig} />
        </BrowserSimpleFieldsContextProvider>
      </PolicyConfigContextProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects inline script by default', () => {
    render(<WrappedComponent />);

    expect(
      screen.getByText('Runs Synthetic test scripts that are defined inline.')
    ).toBeInTheDocument();
  });

  it('does not show ZipUrl source type', async () => {
    render(<WrappedComponent />);

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
  });
});
