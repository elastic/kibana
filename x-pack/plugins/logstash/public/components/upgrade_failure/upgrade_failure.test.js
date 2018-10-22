/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { UpgradeFailure } from './upgrade_failure';

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
    expect(wrapper).toMatchSnapshot();
  });

  it('passes expected text for not new pipeline', () => {
    props.isNewPipeline = false;
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('passes expected text for not manual upgrade', () => {
    props.isManualUpgrade = false;
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('propogates onClose and onRetry functions to child', () => {
    const wrapper = mount(<UpgradeFailure {...props} />);
    expect(wrapper.find('UpgradeFailureActions').props().onClose).toEqual(onClose);
    expect(wrapper.find('UpgradeFailureActions').props().onRetry).toEqual(onRetry);
  });
});
