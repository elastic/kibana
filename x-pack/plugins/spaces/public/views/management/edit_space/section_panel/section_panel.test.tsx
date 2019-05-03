/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SectionPanel } from './section_panel';

test('it renders without blowing up', () => {
  const wrapper = shallowWithIntl(
    <SectionPanel
      collapsible
      iconType="logoElasticsearch"
      title="Elasticsearch"
      description="desc"
      intl={null as any}
    >
      <p>child</p>
    </SectionPanel>
  );

  expect(wrapper).toMatchSnapshot();
});

test('it renders children by default', () => {
  const wrapper = mountWithIntl(
    <SectionPanel
      collapsible
      iconType="logoElasticsearch"
      title="Elasticsearch"
      description="desc"
      intl={null as any}
    >
      <p className="child">child 1</p>
      <p className="child">child 2</p>
    </SectionPanel>
  );

  expect(wrapper.find(SectionPanel)).toHaveLength(1);
  expect(wrapper.find('.child')).toHaveLength(2);
});

test('it hides children when the "hide" link is clicked', () => {
  const wrapper = mountWithIntl(
    <SectionPanel
      collapsible
      iconType="logoElasticsearch"
      title="Elasticsearch"
      description="desc"
      intl={null as any}
    >
      <p className="child">child 1</p>
      <p className="child">child 2</p>
    </SectionPanel>
  );

  expect(wrapper.find(SectionPanel)).toHaveLength(1);
  expect(wrapper.find('.child')).toHaveLength(2);

  wrapper.find(EuiLink).simulate('click');

  expect(wrapper.find('.child')).toHaveLength(0);
});
