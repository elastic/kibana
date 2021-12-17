/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'jest-canvas-mock';

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { SourceField, defaultValues } from './source_field';
import { BrowserSimpleFieldsContextProvider } from '../contexts';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility'),
  useGeneratedHtmlId: () => `id-${Math.random()}`,
}));

jest.mock('../../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../../../src/plugins/kibana_react/public');
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

describe('<SourceField />', () => {
  const WrappedComponent = () => {
    return (
      <BrowserSimpleFieldsContextProvider>
        <SourceField onChange={onChange} />
      </BrowserSimpleFieldsContextProvider>
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
});
