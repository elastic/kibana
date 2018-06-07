/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PageHeader } from './page_header';
import { mount, shallow } from 'enzyme';

test('it renders without crashing', () => {
  const component = shallow(
    <PageHeader breadcrumbs={[]}/>
  );
  expect(component).toMatchSnapshot();
});

test('it renders breadcrumbs', () => {
  const component = mount(
    <PageHeader breadcrumbs={[{
      display: 'id-1',
      href: 'myhref-1',
    }, {
      display: 'id-2',
      href: 'myhref-2',
    }]}
    />
  );

  expect(component.find('a.euiBreadcrumb')).toHaveLength(1);
  expect(component.find('span.euiBreadcrumb')).toHaveLength(1);

});
