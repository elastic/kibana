/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { ReindexWarning } from 'x-pack/plugins/upgrade_assistant/common/types';
import { idForWarning, WarningsConfirmationFlyout } from './warnings_confirmation';

describe('WarningsConfirmationFlyout', () => {
  const defaultProps = {
    advanceNextStep: jest.fn(),
    warnings: [ReindexWarning.allField, ReindexWarning.booleanFields],
    closeFlyout: jest.fn(),
  };

  it('renders', () => {
    expect(shallow(<WarningsConfirmationFlyout {...defaultProps} />)).toMatchSnapshot();
  });

  it('does not allow proceeding until all are checked', () => {
    const wrapper = mount(<WarningsConfirmationFlyout {...defaultProps} />);
    const button = wrapper.find('EuiButton');

    button.simulate('click');
    expect(defaultProps.advanceNextStep).not.toHaveBeenCalled();

    wrapper.find(`input#${idForWarning(ReindexWarning.allField)}`).simulate('change');
    button.simulate('click');
    expect(defaultProps.advanceNextStep).not.toHaveBeenCalled();

    wrapper.find(`input#${idForWarning(ReindexWarning.booleanFields)}`).simulate('change');
    button.simulate('click');
    expect(defaultProps.advanceNextStep).toHaveBeenCalled();
  });
});
