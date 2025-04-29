/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ApmRuleParamsContainer } from '.';

function Wrapper({ children }: { children?: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('ApmRuleParamsContainer', () => {
  it('renders', () => {
    expect(() =>
      render(
        <ApmRuleParamsContainer
          defaultParams={{}}
          fields={[null]}
          setRuleParams={() => {}}
          setRuleProperty={() => {}}
        />,
        {
          wrapper: Wrapper,
        }
      )
    ).not.toThrowError();
  });
});
