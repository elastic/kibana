/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PageHeader } from './page_header';
import { render } from 'enzyme';
import renderer from 'react-test-renderer';

test('it renders without crashing', () => {
  const component = renderer.create(
    <PageHeader breadcrumbs={[]}/>
  );
  expect(component).toMatchSnapshot();
});

test('it renders breadcrumbs', () => {
  const component = render(
    <PageHeader breadcrumbs={[{
      id: 'id-1',
      href: 'myhref-1',
      current: false
    }, {
      id: 'id-2',
      href: 'myhref-2',
      current: true
    }]}
    />
  );

  expect(component.find('a')).toHaveLength(2);

});
