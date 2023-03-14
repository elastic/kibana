/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';

import { renderGroupPanel } from '.';

describe('renderGroupPanel', () => {
  it('renders correctly when the field renderer exists', () => {
    const wrapperRuleName = shallow(
      renderGroupPanel('kibana.alert.rule.name', {
        key: ['Rule name test', 'Some description'],
        doc_count: 10,
      })!
    );

    expect(wrapperRuleName.find('[data-test-subj="rule-name-group-renderer"]')).toBeTruthy();
    const wrapperHostName = shallow(
      renderGroupPanel('host.name', {
        key: 'Host',
        doc_count: 2,
      })!
    );

    expect(wrapperHostName.find('[data-test-subj="host-name-group-renderer"]')).toBeTruthy();
    const wrapperUserName = shallow(
      renderGroupPanel('user.name', {
        key: 'User test',
        doc_count: 1,
      })!
    );

    expect(wrapperUserName.find('[data-test-subj="host-name-group-renderer"]')).toBeTruthy();
    const wrapperSourceIp = shallow(
      renderGroupPanel('source.ip', {
        key: 'sourceIp',
        doc_count: 23,
      })!
    );

    expect(wrapperSourceIp.find('[data-test-subj="source-ip-group-renderer"]')).toBeTruthy();
  });

  it('returns undefined when the renderer does not exist', () => {
    const wrapper = renderGroupPanel('process.name', {
      key: 'process',
      doc_count: 10,
    });

    expect(wrapper).toBeUndefined();
  });
});
