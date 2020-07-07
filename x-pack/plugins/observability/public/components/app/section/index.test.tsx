/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { SectionContainer } from './';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '../../../typings';

describe('SectionContainer', () => {
  it('renders section without app link', () => {
    const component = render(
      <EuiThemeProvider>
        <SectionContainer title="Foo" minHeight={100} hasError={false}>
          <div>I am a very nice component</div>
        </SectionContainer>
      </EuiThemeProvider>
    );
    expect(component.getByText('I am a very nice component')).toBeInTheDocument();
    expect(component.getByText('Foo')).toBeInTheDocument();
    expect(component.queryAllByText('View in app')).toEqual([]);
  });
  it('renders section with app link', () => {
    const component = render(
      <EuiThemeProvider>
        <SectionContainer title="Foo" minHeight={100} appLink="/foo/bar" hasError={false}>
          <div>I am a very nice component</div>
        </SectionContainer>
      </EuiThemeProvider>
    );
    expect(component.getByText('I am a very nice component')).toBeInTheDocument();
    expect(component.getByText('Foo')).toBeInTheDocument();
    expect(component.getByText('View in app')).toBeInTheDocument();
  });
});
