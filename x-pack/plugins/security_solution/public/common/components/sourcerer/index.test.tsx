/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { SecurityPageName } from '../../containers/sourcerer/constants';
import { mockPatterns, mockSourceGroup } from '../../containers/sourcerer/mocks';
import { MaybeSourcerer } from './index';
import * as i18n from './translations';
import { ADD_INDEX_PATH } from '../../../../common/constants';

const updateSourceGroupIndicies = jest.fn();
const mockManageSource = {
  activeSourceGroupId: SecurityPageName.default,
  availableIndexPatterns: mockPatterns,
  availableSourceGroupIds: [SecurityPageName.default],
  getManageSourceGroupById: jest.fn().mockReturnValue(mockSourceGroup(SecurityPageName.default)),
  initializeSourceGroup: jest.fn(),
  isIndexPatternsLoading: false,
  setActiveSourceGroupId: jest.fn(),
  updateSourceGroupIndicies,
};
jest.mock('../../containers/sourcerer', () => {
  const original = jest.requireActual('../../containers/sourcerer');

  return {
    ...original,
    useManageSource: () => mockManageSource,
  };
});

const mockOptions = [
  { label: 'auditbeat-*', key: 'auditbeat-*-0', value: 'auditbeat-*', checked: 'on' },
  { label: 'endgame-*', key: 'endgame-*-1', value: 'endgame-*', checked: 'on' },
  { label: 'filebeat-*', key: 'filebeat-*-2', value: 'filebeat-*', checked: 'on' },
  { label: 'logs-*', key: 'logs-*-3', value: 'logs-*', checked: 'on' },
  { label: 'packetbeat-*', key: 'packetbeat-*-4', value: 'packetbeat-*', checked: undefined },
  { label: 'winlogbeat-*', key: 'winlogbeat-*-5', value: 'winlogbeat-*', checked: 'on' },
  {
    label: 'apm-*-transaction*',
    key: 'apm-*-transaction*-0',
    value: 'apm-*-transaction*',
    disabled: true,
    checked: undefined,
  },
  {
    label: 'blobbeat-*',
    key: 'blobbeat-*-1',
    value: 'blobbeat-*',
    disabled: true,
    checked: undefined,
  },
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
  it('onChange calls updateSourceGroupIndicies', () => {
    const wrapper = mount(<MaybeSourcerer />);
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');

    const switcherOnChange = wrapper
      .find(`[data-test-subj="indexPattern-switcher"]`)
      .first()
      .prop('onChange');
    // @ts-ignore
    switcherOnChange([mockOptions[0], mockOptions[1]]);
    expect(updateSourceGroupIndicies).toHaveBeenCalledWith(SecurityPageName.default, [
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
