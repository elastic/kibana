/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceAlertTrigger } from './';

function Wrapper({ children }: { children?: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('ServiceAlertTrigger', () => {
  it('renders', () => {
    expect(() =>
      render(
        <ServiceAlertTrigger
          defaults={{}}
          fields={[null]}
          setAlertParams={() => {}}
          setAlertProperty={() => {}}
        />,
        {
          wrapper: Wrapper,
        }
      )
    ).not.toThrowError();
  });
});
