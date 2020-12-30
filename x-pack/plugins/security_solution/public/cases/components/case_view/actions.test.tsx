/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useDeleteCases } from '../../containers/use_delete_cases';
import { TestProviders } from '../../../common/mock';
import { basicCase, basicPush } from '../../containers/mock';
import { CaseViewActions } from './actions';
import * as i18n from './translations';
jest.mock('../../containers/use_delete_cases');
const useDeleteCasesMock = useDeleteCases as jest.Mock;

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

describe('CaseView actions', () => {
  const handleOnDeleteConfirm = jest.fn();
  const handleToggleModal = jest.fn();
  const dispatchResetIsDeleted = jest.fn();
  const defaultDeleteState = {
    dispatchResetIsDeleted,
    handleToggleModal,
    handleOnDeleteConfirm,
    isLoading: false,
    isError: false,
    isDeleted: false,
    isDisplayConfirmDeleteModal: false,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    useDeleteCasesMock.mockImplementation(() => defaultDeleteState);
  });
  it('clicking trash toggles modal', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseViewActions caseData={basicCase} currentExternalIncident={null} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();

    wrapper.find('button[data-test-subj="property-actions-ellipses"]').first().simulate('click');
    wrapper.find('button[data-test-subj="property-actions-trash"]').simulate('click');
    expect(handleToggleModal).toHaveBeenCalled();
  });
  it('toggle delete modal and confirm', () => {
    useDeleteCasesMock.mockImplementation(() => ({
      ...defaultDeleteState,
      isDisplayConfirmDeleteModal: true,
    }));
    const wrapper = mount(
      <TestProviders>
        <CaseViewActions caseData={basicCase} currentExternalIncident={null} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
    wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');
    expect(handleOnDeleteConfirm.mock.calls[0][0]).toEqual([
      { id: basicCase.id, title: basicCase.title },
    ]);
  });
  it('displays active incident link', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseViewActions
          caseData={basicCase}
          currentExternalIncident={{
            ...basicPush,
            firstPushIndex: 5,
            lastPushIndex: 5,
            commentsToUpdate: [],
            hasDataToPush: false,
          }}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();

    wrapper.find('button[data-test-subj="property-actions-ellipses"]').first().simulate('click');
    expect(
      wrapper.find('[data-test-subj="property-actions-popout"]').first().prop('aria-label')
    ).toEqual(i18n.VIEW_INCIDENT(basicPush.externalTitle));
  });
});
