/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '../../../utils/test_helper';
import { SectionContainer } from './';

describe('SectionContainer', () => {
  it('renders section without app link', () => {
    const component = render(
      <SectionContainer title="Foo" hasError={false}>
        <div>I am a very nice component</div>
      </SectionContainer>
    );
    expect(component.getByText('I am a very nice component')).toBeInTheDocument();
    expect(component.getByText('Foo')).toBeInTheDocument();
    expect(component.queryAllByText('View in app')).toEqual([]);
  });
  it('renders section with app link', () => {
    const component = render(
      <SectionContainer title="Foo" appLink="/foo/bar" hasError={false}>
        <div>I am a very nice component</div>
      </SectionContainer>
    );
    expect(component.getByText('I am a very nice component')).toBeInTheDocument();
    expect(component.getByText('Foo')).toBeInTheDocument();
    expect(component.getByText('View in app')).toBeInTheDocument();
  });
  it('renders section with error', () => {
    const component = render(
      <SectionContainer title="Foo" hasError={true}>
        <div>I am a very nice component</div>
      </SectionContainer>
    );
    expect(component.queryByText('I am a very nice component')).not.toBeInTheDocument();
    expect(component.getByText('Foo')).toBeInTheDocument();
    expect(
      component.getByText('An error happened when trying to fetch data. Please try again')
    ).toBeInTheDocument();
  });
});
