/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@kbn/kibana-react-plugin/public/code_editor/code_editor.test.helpers';
import { TestProvider } from '../../test/test_provider';
import { getCloudDefendNewPolicyMock } from './mocks';
import { ConfigYamlView } from '.';
import './__mocks__/worker';
import './__mocks__/resizeobserver';

// @ts-ignore-next
window.Worker = Worker;

describe('<CloudDefendCreatePolicyExtension />', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  const onChange = jest.fn();

  const WrappedComponent = ({ policy = getCloudDefendNewPolicyMock() }) => {
    return (
      <TestProvider>
        <ConfigYamlView policy={policy} onChange={onChange} />;
      </TestProvider>
    );
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders a checkbox to toggle BPF/LSM control mechanism', () => {
    const { getByTestId } = render(<WrappedComponent />);
    const input = getByTestId('cloud-defend-control-toggle') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toBeEnabled();
  });

  it('renders a yaml editor', () => {
    const { getByTestId } = render(<WrappedComponent />);
    const el = getByTestId('monacoEditorTextarea') as HTMLTextAreaElement;
    expect(el).toBeInTheDocument();
  });
});
