/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { mockPatterns, mockSourceGroup } from '../../containers/sourcerer/mocks';
import { MaybeSourcerer } from './index';
import * as i18n from './translations';
import { ADD_INDEX_PATH } from '../../../../common/constants';

const updateSourceGroupIndices = jest.fn();
const mockManageSource = {
  activeSourceGroupId: SourcererScopeName.default,
  kibanaIndexPatterns: mockPatterns,
  getManageSourceGroupById: jest.fn().mockReturnValue(mockSourceGroup(SourcererScopeName.default)),
  initializeSourceGroup: jest.fn(),
  isIndexPatternsLoading: false,
  setActiveSourceGroupId: jest.fn(),
  updateSourceGroupIndices,
};
jest.mock('../../containers/sourcerer', () => {
  const original = jest.requireActual('../../containers/sourcerer');

  return {
    ...original,
    useManageSource: () => mockManageSource,
  };
});

const mockOptions = [
  {
    label: 'apm-*-transaction*',
    key: 'apm-*-transaction*-0',
    value: 'apm-*-transaction*',
    checked: 'on',
  },
  { label: 'auditbeat-*', key: 'auditbeat-*-1', value: 'auditbeat-*', checked: 'on' },
  { label: 'endgame-*', key: 'endgame-*-2', value: 'endgame-*', checked: 'on' },
  { label: 'filebeat-*', key: 'filebeat-*-3', value: 'filebeat-*', checked: 'on' },
  { label: 'logs-*', key: 'logs-*-4', value: 'logs-*', checked: 'on' },
  { label: 'packetbeat-*', key: 'packetbeat-*-5', value: 'packetbeat-*', checked: 'on' },
  { label: 'winlogbeat-*', key: 'winlogbeat-*-6', value: 'winlogbeat-*', checked: 'on' },
  { label: 'journalbeat-*', key: 'journalbeat-*-0', value: 'journalbeat-*' },
];

describe('Sourcerer component', () => {
  // Using props callback instead of simulating clicks,
  // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
  it('Mounts with correct options selected and disabled', () => {
    const wrapper = mount(<MaybeSourcerer />);
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="indexPattern-switcher"]`).first().prop('options')
    ).toEqual(mockOptions);
  });
  it('onChange calls updateSourceGroupIndices', () => {
    const wrapper = mount(<MaybeSourcerer />);
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');

    const switcherOnChange = wrapper
      .find(`[data-test-subj="indexPattern-switcher"]`)
      .first()
      .prop('onChange');
    // @ts-ignore
    switcherOnChange([mockOptions[0], mockOptions[1]]);
    expect(updateSourceGroupIndices).toHaveBeenCalledWith(SourcererScopeName.default, [
      mockOptions[0].value,
      mockOptions[1].value,
    ]);
  });
  it('Disabled options have icon tooltip', () => {
    const wrapper = mount(<MaybeSourcerer />);
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    // @ts-ignore
    const Rendered = wrapper
      .find(`[data-test-subj="indexPattern-switcher"]`)
      .first()
      .prop('renderOption')(
      {
        label: 'blobbeat-*',
        key: 'blobbeat-*-1',
        value: 'blobbeat-*',
        disabled: true,
        checked: undefined,
      },
      ''
    );
    expect(Rendered.props.children[1].props.content).toEqual(i18n.DISABLED_INDEX_PATTERNS);
  });

  it('Button links to index path', () => {
    const wrapper = mount(<MaybeSourcerer />);
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="add-index"]`).first().prop('href')).toEqual(
      ADD_INDEX_PATH
    );
  });
});
