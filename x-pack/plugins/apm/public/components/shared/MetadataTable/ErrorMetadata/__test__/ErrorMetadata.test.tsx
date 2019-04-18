/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ErrorMetadata } from '..';
import { render, cleanup } from 'react-testing-library';
import { APMError } from '../../../../../../typings/es_schemas/ui/APMError';
import 'jest-dom/extend-expect';

function getError() {
  return ({
    labels: { someKey: 'labels value' },
    http: { someKey: 'http value' },
    host: { someKey: 'host value' },
    container: { someKey: 'container value' },
    service: { someKey: 'service value' },
    process: { someKey: 'process value' },
    agent: { someKey: 'agent value' },
    url: { someKey: 'url value' },
    user: { someKey: 'user value' },
    notIncluded: true,
    error: {
      notIncluded: true,
      custom: {
        someKey: 'custom value'
      }
    }
  } as unknown) as APMError;
}

function expectNotInDocument(output: any, text: string) {
  try {
    output.getByText(text);
  } catch (err) {
    if (err.message.startsWith('Unable to find an element with the text:')) {
      return;
    } else {
      throw err;
    }
  }

  throw new Error(`Unexpected text found: ${text}`);
}

describe('ErrorMetadata', () => {
  afterEach(cleanup);

  it('should render a transaction with all sections', () => {
    const error = getError();
    const output = render(<ErrorMetadata error={error} />);
    expect(output).toMatchSnapshot();

    expect(output.getByText('Labels')).toBeInTheDocument();
    expect(output.getByText('HTTP')).toBeInTheDocument();
    expect(output.getByText('Host')).toBeInTheDocument();
    expect(output.getByText('Container')).toBeInTheDocument();
    expect(output.getByText('Service')).toBeInTheDocument();
    expect(output.getByText('Process')).toBeInTheDocument();
    expect(output.getByText('Agent')).toBeInTheDocument();
    expect(output.getByText('URL')).toBeInTheDocument();
    expect(output.getByText('User')).toBeInTheDocument();
    expect(output.getByText('Custom')).toBeInTheDocument();
  });

  it('should render a transaction with only the required sections', () => {
    const error = {} as APMError;
    const output = render(<ErrorMetadata error={error} />);
    expect(output).toMatchSnapshot();

    expect(output.getByText('Labels')).toBeInTheDocument();
    expect(output.getByText('User')).toBeInTheDocument();

    expectNotInDocument(output, 'HTTP');
    expectNotInDocument(output, 'Host');
    expectNotInDocument(output, 'Container');
    expectNotInDocument(output, 'Service');
    expectNotInDocument(output, 'Process');
    expectNotInDocument(output, 'Agent');
    expectNotInDocument(output, 'URL');
    expectNotInDocument(output, 'Custom');
  });
});
