/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText, EuiModal } from '@elastic/eui';

import { EntSearchLogStream } from '../../../../../shared/log_stream';

import { AuditLogsModal } from './audit_logs_modal';

import { AuditLogsModalLogic } from './audit_logs_modal_logic';

describe('AuditLogsModal', () => {
  const { mount } = new LogicMounter(AuditLogsModalLogic);
  beforeEach(() => {
    jest.clearAllMocks();
    mount({ isModalVisible: true });
  });

  it('renders nothing by default', () => {
    const wrapper = shallow(<AuditLogsModal />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders the modal when modal visible', () => {
    const testEngineName = 'test-engine-123';
    const mockClose = jest.fn();
    setMockValues({
      isModalVisible: true,
      engineName: testEngineName,
    });
    setMockActions({
      hideModal: mockClose,
    });

    const wrapper = shallow(<AuditLogsModal />);
    expect(wrapper.find(EntSearchLogStream).prop('query')).toBe(
      `event.kind: event and event.action: audit and enterprisesearch.data_repository.name: ${testEngineName}`
    );
    expect(wrapper.find(EuiText).children().text()).toBe('Showing events from last 24 hours');
    expect(wrapper.find(EuiModal).prop('onClose')).toBe(mockClose);
  });
});
