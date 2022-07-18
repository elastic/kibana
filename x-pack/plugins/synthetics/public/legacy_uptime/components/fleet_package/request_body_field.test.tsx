/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';

import React, { useState, useCallback } from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { RequestBodyField } from './request_body_field';
import { Mode } from './types';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
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

describe('<RequestBodyField />', () => {
  const defaultMode = Mode.PLAINTEXT;
  const defaultValue = 'sample value';
  const WrappedComponent = () => {
    const [config, setConfig] = useState({
      type: defaultMode,
      value: defaultValue,
    });

    return (
      <RequestBodyField
        type={config.type}
        value={config.value}
        onChange={useCallback(
          (code) => setConfig({ type: code.type as Mode, value: code.value }),
          [setConfig]
        )}
      />
    );
  };

  it('renders RequestBodyField', () => {
    const { getByText, getByLabelText } = render(<WrappedComponent />);

    expect(getByText('Form')).toBeInTheDocument();
    expect(getByText('Text')).toBeInTheDocument();
    expect(getByText('XML')).toBeInTheDocument();
    expect(getByText('JSON')).toBeInTheDocument();
    expect(getByLabelText('Text code editor')).toBeInTheDocument();
  });

  it('handles changing code editor mode', async () => {
    const { getByText, getByLabelText, queryByText, queryByLabelText } = render(
      <WrappedComponent />
    );

    // currently text code editor is displayed
    expect(getByLabelText('Text code editor')).toBeInTheDocument();
    expect(queryByText('Key')).not.toBeInTheDocument();

    const formButton = getByText('Form').closest('button');
    if (formButton) {
      fireEvent.click(formButton);
    }
    await waitFor(() => {
      expect(getByText('Add form field')).toBeInTheDocument();
      expect(queryByLabelText('Text code editor')).not.toBeInTheDocument();
    });
  });
});
