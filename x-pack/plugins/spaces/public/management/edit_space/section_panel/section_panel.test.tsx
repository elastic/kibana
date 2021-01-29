/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { SectionPanel } from './section_panel';

test('it renders without blowing up', () => {
  const wrapper = shallowWithIntl(
    <SectionPanel iconType="logoElasticsearch" title="Elasticsearch" description="desc">
      <p>child</p>
    </SectionPanel>
  );

  expect(wrapper).toMatchSnapshot();
});

test('it renders children', () => {
  const wrapper = mountWithIntl(
    <SectionPanel iconType="logoElasticsearch" title="Elasticsearch" description="desc">
      <p className="child">child 1</p>
      <p className="child">child 2</p>
    </SectionPanel>
  );

  expect(wrapper.find(SectionPanel)).toHaveLength(1);
  expect(wrapper.find('.child')).toHaveLength(2);
});
