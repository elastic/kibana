/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';

import React, { useState, useCallback } from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/react';
import { mockGlobals } from '../../../utils/testing';
import { render } from '../../../utils/testing/rtl_helpers';
import { RequestBodyField } from './request_body_field';
import { CodeEditorMode } from '../types';

mockGlobals();

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
        readOnly={props.readOnly}
      />
    ),
  };
});

describe('<RequestBodyField />', () => {
  const defaultMode = CodeEditorMode.PLAINTEXT;
  const defaultValue = 'sample value';
  const WrappedComponent = ({ readOnly }: { readOnly?: boolean }) => {
    const [config, setConfig] = useState({
      type: defaultMode,
      value: defaultValue,
    });

    return (
      <RequestBodyField
        value={{
          value: config.value,
          type: config.type,
        }}
        onChange={useCallback(
          (code) => setConfig({ type: code.type as CodeEditorMode, value: code.value }),
          [setConfig]
        )}
        readOnly={readOnly}
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

  it('handles updating input', async () => {
    const { getByText, getByRole, getAllByRole, getByLabelText } = render(<WrappedComponent />);

    expect(getByLabelText('Text code editor')).toBeInTheDocument();
    const textbox = getByRole('textbox');
    userEvent.type(textbox, 'text');
    expect(textbox).toHaveValue('text');

    const xmlButton = getByText('XML').closest('button');
    if (xmlButton) {
      fireEvent.click(xmlButton);
    }

    expect(xmlButton).toHaveAttribute('aria-selected', 'true');
    userEvent.type(textbox, 'xml');
    expect(textbox).toHaveValue('textxml');

    const jsonButton = getByText('JSON').closest('button');
    if (jsonButton) {
      fireEvent.click(jsonButton);
    }

    expect(jsonButton).toHaveAttribute('aria-selected', 'true');
    userEvent.type(textbox, 'json');
    expect(textbox).toHaveValue('textxmljson');

    const formButton = getByText('Form').closest('button');
    if (formButton) {
      fireEvent.click(formButton);
    }

    expect(formButton).toHaveAttribute('aria-selected', 'true');
    userEvent.click(getByText('Add form field'));
    expect(getByText('Key')).toBeInTheDocument();
    expect(getByText('Value')).toBeInTheDocument();
    const keyValueTextBox = getAllByRole('textbox')[0];
    userEvent.type(keyValueTextBox, 'formfield');
    expect(keyValueTextBox).toHaveValue('formfield');
  });

  it('handles read only', async () => {
    const { getByText, getByRole, getByLabelText } = render(<WrappedComponent readOnly={true} />);

    expect(getByLabelText('Text code editor')).toBeInTheDocument();
    const textbox = getByRole('textbox');
    userEvent.type(textbox, 'text');
    expect(textbox).toHaveValue('');

    const xmlButton = getByText('XML').closest('button');
    if (xmlButton) {
      fireEvent.click(xmlButton);
    }

    expect(xmlButton).toHaveAttribute('aria-selected', 'true');
    userEvent.type(textbox, 'xml');
    expect(textbox).toHaveValue('');

    const jsonButton = getByText('JSON').closest('button');
    if (jsonButton) {
      fireEvent.click(jsonButton);
    }

    expect(jsonButton).toHaveAttribute('aria-selected', 'true');
    userEvent.type(textbox, 'json');
    expect(textbox).toHaveValue('');

    const formButton = getByText('Form').closest('button');
    if (formButton) {
      fireEvent.click(formButton);
    }

    expect(formButton).toHaveAttribute('aria-selected', 'true');
    expect(getByRole('button', { name: 'Add form field' })).toBeDisabled();
  });
});
