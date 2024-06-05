/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import { TrainedModelsDeploymentModal } from '../../../public/application/sections/home/index_list/details_page/trained_models_deployment_modal';
import { act } from 'react-dom/test-utils';

const refreshModal = jest.fn();
const setIsModalVisible = jest.fn();
const tryAgainForErrorModal = jest.fn();
const setIsVisibleForErrorModal = jest.fn();

describe('When semantic_text is enabled', () => {
  describe('When there is no error in the model deployment', () => {
    const setup = registerTestBed(TrainedModelsDeploymentModal, {
      defaultProps: {
        setIsModalVisible,
        refreshModal,
        pendingDeployments: ['.elser-test-3'],
        errorsInTrainedModelDeployment: [],
      },
      memoryRouter: { wrapComponent: false },
    });
    const { exists, find } = setup();

    it('should display the modal', () => {
      expect(exists('trainedModelsDeploymentModal')).toBe(true);
    });

    it('should contain content related to semantic_text', () => {
      expect(find('trainedModelsDeploymentModalText').text()).toContain(
        'Some fields are referencing models'
      );
    });

    it('should call refresh method if refresh button is pressed', async () => {
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      expect(refreshModal.mock.calls).toHaveLength(1);
    });

    it('should call setIsModalVisible method if cancel button is pressed', async () => {
      await act(async () => {
        find('confirmModalCancelButton').simulate('click');
      });
      expect(setIsModalVisible).toHaveBeenLastCalledWith(false);
    });
  });

  describe('When there is error in the model deployment', () => {
    const setup = registerTestBed(TrainedModelsDeploymentModal, {
      defaultProps: {
        setIsModalVisible: setIsVisibleForErrorModal,
        refreshModal: tryAgainForErrorModal,
        pendingDeployments: ['.elser-test-3'],
        errorsInTrainedModelDeployment: ['.elser-test-3'],
      },
      memoryRouter: { wrapComponent: false },
    });
    const { exists, find } = setup();

    it('should display the modal', () => {
      expect(exists('trainedModelsErroredDeploymentModal')).toBe(true);
    });

    it('should contain content related to semantic_text', () => {
      expect(find('trainedModelsErrorDeploymentModalText').text()).toContain(
        'There was an error when trying to deploy'
      );
    });

    it("should call refresh method if 'Try again' button is pressed", async () => {
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      expect(tryAgainForErrorModal.mock.calls).toHaveLength(1);
    });

    it('should call setIsVisibleForErrorModal method if cancel button is pressed', async () => {
      await act(async () => {
        find('confirmModalCancelButton').simulate('click');
      });
      expect(setIsVisibleForErrorModal).toHaveBeenLastCalledWith(false);
    });
  });
});
