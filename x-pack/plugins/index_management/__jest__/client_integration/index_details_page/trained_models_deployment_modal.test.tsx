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

describe('<TrainedModelsDeploymentModal /> with semantic_text enabled', () => {
  const setup = registerTestBed(TrainedModelsDeploymentModal, {
    defaultProps: {
      isSemanticTextEnabled: true,
      pendingDeployments: ['.elser-test-3'],
      setIsModalVisible,
      refreshModal,
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
    expect(setIsModalVisible.mock.calls).toHaveLength(1);
  });
});

describe('<TrainedModelsDeploymentModal /> with semantic_text disabled', () => {
  const setup = registerTestBed(TrainedModelsDeploymentModal, {
    defaultProps: { isSemanticTextEnabled: false },
    memoryRouter: { wrapComponent: false },
  });
  const { exists } = setup();
  it('it should not display the modal', () => {
    expect(exists('trainedModelsDeploymentModal')).toBe(false);
  });
});
