/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { noDeleteCasesPermissions, TestProviders } from '../../common/mock';
import { basicCase, basicPush } from '../../containers/mock';
import { Actions } from './actions';
import * as i18n from '../case_view/translations';
import * as api from '../../containers/api';
import { waitFor } from '@testing-library/dom';

jest.mock('../../containers/api');

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

const defaultProps = {
  allCasesNavigation: {
    href: 'all-cases-href',
    onClick: () => {},
  },
  caseData: basicCase,
  currentExternalIncident: null,
};

describe('CaseView actions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('clicking trash toggles modal', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();
    wrapper.find('button[data-test-subj="property-actions-ellipses"]').first().simulate('click');
    wrapper.find('button[data-test-subj="property-actions-trash"]').simulate('click');
    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
  });

  it('does not show trash icon when user does not have deletion privileges', () => {
    const wrapper = mount(
      <TestProviders permissions={noDeleteCasesPermissions()}>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeFalsy();
    expect(wrapper.find('button[data-test-subj="property-actions-ellipses"]').exists()).toBeFalsy();
  });

  it('toggle delete modal and confirm', async () => {
    const deleteCasesSpy = jest
      .spyOn(api, 'deleteCases')
      .mockRejectedValue(new Error('useDeleteCases: Test error'));

    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="property-actions-ellipses"]').first().simulate('click');
    wrapper.find('button[data-test-subj="property-actions-trash"]').simulate('click');

    expect(wrapper.find('[data-test-subj="confirm-delete-case-modal"]').exists()).toBeTruthy();
    wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');

    await waitFor(() => {
      expect(deleteCasesSpy).toHaveBeenCalledWith(['basic-case-id'], expect.anything());
    });
  });

  it('displays active incident link', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          {...defaultProps}
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
