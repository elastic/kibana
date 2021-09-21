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
import { BrowserSimpleFields } from './simple_fields';
import { BrowserSimpleFieldsContextProvider } from '../contexts';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
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

const setShowTLS = jest.fn();

describe('<SourceField />', () => {
  const WrappedComponent = () => {
    return (
      <BrowserSimpleFieldsContextProvider>
        <BrowserSimpleFields validate={{}} setShowTLS={setShowTLS} />
      </BrowserSimpleFieldsContextProvider>
    );
  };

  beforeEach(() => {
    setShowTLS.mockClear();
  });

  it('calls setShowTLS when inline zip url ', async () => {
    render(<WrappedComponent />);

    await waitFor(() => {
      expect(setShowTLS).toBeCalledWith(true);
    });

    setShowTLS.mockClear();

    const inlineTab = screen.getByTestId('syntheticsSourceTab__inline');
    fireEvent.click(inlineTab);

    await waitFor(() => {
      expect(setShowTLS).toBeCalledWith(false);
    });

    setShowTLS.mockClear();

    const zipUrlTab = screen.getByTestId('syntheticsSourceTab__zipUrl');
    fireEvent.click(zipUrlTab);

    await waitFor(() => {
      expect(setShowTLS).toBeCalledWith(true);
    });
  });
});
