/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { ConfirmModal } from './';

const onCancel = jest.fn();
const onConfirm = jest.fn();

describe('ConfirmModal', () => {
  it('should render', () => {
    const props = { onCancel, onConfirm, children: <></> };
    const wrapper = shallow(<ConfirmModal {...props} />);

    expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);
    expect(wrapper.find(EuiOverlayMask)).toHaveLength(1);
  });
});
