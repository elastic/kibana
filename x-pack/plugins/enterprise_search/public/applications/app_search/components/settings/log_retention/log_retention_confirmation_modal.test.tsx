/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { LogRetentionOptions } from '../../log_retention';

import { GenericConfirmationModal } from './generic_confirmation_modal';
import { LogRetentionConfirmationModal } from './log_retention_confirmation_modal';

describe('<LogRetentionConfirmationModal />', () => {
  const actions = {
    closeModals: jest.fn(),
    saveLogRetention: jest.fn(),
  };

  const values = {
    openedModal: null,
    logRetention: {
      analytics: {
        enabled: true,
        retentionPolicy: {
          isDefault: true,
          minAgeDays: 180,
        },
      },
      api: {
        enabled: true,
        retentionPolicy: {
          isDefault: true,
          minAgeDays: 7,
        },
      },
      crawler: {
        enabled: true,
        retentionPolicy: {
          isDefault: true,
          minAgeDays: 7,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    setMockValues(values);
  });

  it('renders nothing by default', () => {
    const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
    expect(logRetentionPanel.isEmptyRender()).toBe(true);
  });

  describe('analytics', () => {
    it('renders the Analytics panel when openedModal is set to Analytics', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.Analytics,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      expect(
        logRetentionPanel.find('[data-test-subj="AnalyticsLogRetentionConfirmationModal"]').length
      ).toBe(1);
    });

    it('calls saveLogRetention on save when showing analytics', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.Analytics,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onSave')();
      expect(actions.saveLogRetention).toHaveBeenCalledWith(LogRetentionOptions.Analytics, false);
    });

    it('calls closeModals on close', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.Analytics,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onClose')();
      expect(actions.closeModals).toHaveBeenCalled();
    });
  });

  describe('api', () => {
    it('renders the API panel when openedModal is set to API', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.API,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      expect(
        logRetentionPanel.find('[data-test-subj="APILogRetentionConfirmationModal"]').length
      ).toBe(1);
    });

    it('calls saveLogRetention on save when showing api', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.API,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onSave')();
      expect(actions.saveLogRetention).toHaveBeenCalledWith(LogRetentionOptions.API, false);
    });

    it('calls closeModals on close', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.API,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onClose')();
      expect(actions.closeModals).toHaveBeenCalled();
    });
  });

  describe('crawler', () => {
    it('renders the Crawler panel when openedModal is set to Crawler', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.Crawler,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      expect(
        logRetentionPanel.find('[data-test-subj="CrawlerLogRetentionConfirmationModal"]').length
      ).toBe(1);
    });

    it('calls saveLogRetention on save when showing crawler', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.Crawler,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onSave')();
      expect(actions.saveLogRetention).toHaveBeenCalledWith(LogRetentionOptions.Crawler, false);
    });

    it('calls closeModals on close', () => {
      setMockValues({
        ...values,
        openedModal: LogRetentionOptions.Crawler,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onClose')();
      expect(actions.closeModals).toHaveBeenCalled();
    });
  });
});
