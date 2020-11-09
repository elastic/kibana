/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';
import { setMockActions, setMockValues } from '../../../../__mocks__';

import React from 'react';
import ReactDOM from 'react-dom';
import { shallow } from 'enzyme';

import { LogRetentionConfirmationModal } from './log_retention_confirmation_modal';
import { ELogRetentionOptions } from './types';
import { GenericConfirmationModal } from './generic_confirmation_modal';

describe('<LogRetentionConfirmationModal />', () => {
  beforeAll(() => {
    // LogRetentionConfirmationModal contains EuiModals, which utilize React Portals,
    // so we must mock `createPortal` to get the rendered element directly,
    // instead of letting it be placed normally elsewhere in DOM (outside of jest's domain)
    // @ts-ignore
    ReactDOM.createPortal = jest.fn((element) => {
      return element;
    });
  });

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
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    setMockValues(values);
  });

  afterEach(() => {
    // Remove the jest mock on createPortal
    // @ts-ignore
    ReactDOM.createPortal.mockClear();
  });

  it('renders nothing by default', () => {
    const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
    expect(logRetentionPanel.isEmptyRender()).toBe(true);
  });

  describe('analytics', () => {
    it('renders the Analytics panel when openedModal is set to Analytics', () => {
      setMockValues({
        ...values,
        openedModal: ELogRetentionOptions.Analytics,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      expect(
        logRetentionPanel.find('[data-test-subj="AnalyticsLogRetentionConfirmationModal"]').length
      ).toBe(1);
    });

    it('calls saveLogRetention on save when showing analytics', () => {
      setMockValues({
        ...values,
        openedModal: ELogRetentionOptions.Analytics,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onSave')();
      expect(actions.saveLogRetention).toHaveBeenCalledWith(ELogRetentionOptions.Analytics, false);
    });

    it('calls closeModals on close', () => {
      setMockValues({
        ...values,
        openedModal: ELogRetentionOptions.Analytics,
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
        openedModal: ELogRetentionOptions.API,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      expect(
        logRetentionPanel.find('[data-test-subj="APILogRetentionConfirmationModal"]').length
      ).toBe(1);
    });

    it('calls saveLogRetention on save when showing api', () => {
      setMockValues({
        ...values,
        openedModal: ELogRetentionOptions.API,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onSave')();
      expect(actions.saveLogRetention).toHaveBeenCalledWith(ELogRetentionOptions.API, false);
    });

    it('calls closeModals on close', () => {
      setMockValues({
        ...values,
        openedModal: ELogRetentionOptions.API,
      });

      const logRetentionPanel = shallow(<LogRetentionConfirmationModal />);
      const genericConfirmationModal = logRetentionPanel.find(GenericConfirmationModal);
      genericConfirmationModal.prop('onClose')();
      expect(actions.closeModals).toHaveBeenCalled();
    });
  });
});
