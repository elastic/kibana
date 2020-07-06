/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { expectTextsInDocument } from '../../../../../utils/testHelpers';
import { ErrorCount } from '../ErrorCount';

describe('ErrorCount', () => {
  it('shows singular error message', () => {
    const component = render(<ErrorCount count={1} />);
    expectTextsInDocument(component, ['1 Error']);
  });
  it('shows plural error message', () => {
    const component = render(<ErrorCount count={2} />);
    expectTextsInDocument(component, ['2 Errors']);
  });
  it('prevents click propagation', () => {
    const mock = jest.fn();
    const { getByText } = render(
      <button onClick={mock}>
        <ErrorCount count={1} />
      </button>
    );
    fireEvent(
      getByText('1 Error'),
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
    );
    expect(mock).not.toHaveBeenCalled();
  });
});
