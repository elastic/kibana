/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { UpgradeFailure } from './upgrade_failure';
import { UPGRADE_FAILURE } from '../../../common/constants';

describe('UpgradeFailure component', () => {
  let props;
  let onClose;
  let onRetry;

  beforeEach(() => {
    onClose = jest.fn();
    onRetry = jest.fn();

    props = {
      isManualUpgrade: true,
      isNewPipeline: true,
      onClose,
      onRetry,
    };
  });

  it('renders component as expected', () => {
    const wrapper = shallow(<UpgradeFailure {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('passes expected text for new pipeline', () => {
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper.find('p')).toHaveLength(1);
    expect(wrapper.find('p').text()).toEqual(UPGRADE_FAILURE.MESSAGE.IS_NEW_PIPELINE);
  });

  it('passes expected text for not new pipeline', () => {
    props.isNewPipeline = false;
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper.find('p')).toHaveLength(1);
    expect(wrapper.find('p').text()).toEqual(UPGRADE_FAILURE.MESSAGE.NOT_NEW_PIPELINE);
  });

  it('passes expected text for manual upgrade', () => {
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper.find('UpgradeFailureActions').props().upgradeButtonText)
      .toEqual(UPGRADE_FAILURE.UPGRADE_BUTTON_TEXT.IS_MANUAL_UPGRADE);
    expect(wrapper.find('UpgradeFailureTitle').props().titleText)
      .toEqual(UPGRADE_FAILURE.TITLE.IS_MANUAL_UPGRADE);
  });

  it('passes expected text for not manual upgrade', () => {
    props.isManualUpgrade = false;
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper.find('UpgradeFailureActions').props().upgradeButtonText)
      .toEqual(UPGRADE_FAILURE.UPGRADE_BUTTON_TEXT.NOT_MANUAL_UPGRADE);
    expect(wrapper.find('UpgradeFailureTitle').props().titleText)
      .toEqual(UPGRADE_FAILURE.TITLE.NOT_MANUAL_UPGRADE);
  });

  it('propogates onClose and onRetry functions to child', () => {
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper.find('UpgradeFailureActions').props().onClose).toEqual(onClose);
    expect(wrapper.find('UpgradeFailureActions').props().onRetry).toEqual(onRetry);
  });
});
