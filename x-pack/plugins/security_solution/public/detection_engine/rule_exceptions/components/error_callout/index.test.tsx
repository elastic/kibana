/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { coreMock } from '@kbn/core/public/mocks';
import { getListMock } from '../../../../../common/detection_engine/schemas/types/lists.mock';
import { useDisassociateExceptionList } from '../../../../detections/containers/detection_engine/rules/use_disassociate_exception_list';
import { ErrorCallout } from '.';
import { savedRuleMock } from '../../../rule_management/logic/mock';

jest.mock(
  '../../../../detections/containers/detection_engine/rules/use_disassociate_exception_list'
);

const mockKibanaHttpService = coreMock.createStart().http;

describe('ErrorCallout', () => {
  const mockDisassociate = jest.fn();

  beforeEach(() => {
    (useDisassociateExceptionList as jest.Mock).mockReturnValue([false, mockDisassociate]);
  });

  it('it renders error details', () => {
    const wrapper = mountWithIntl(
      <ErrorCallout
        http={mockKibanaHttpService}
        errorInfo={{
          reason: 'error reason',
          code: 500,
          details: null,
          listListId: null,
        }}
        rule={{ ...savedRuleMock, exceptions_list: [getListMock()] }}
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="errorCalloutContainer"] .euiCallOutHeader__title')
        .last()
        .text()
    ).toEqual('Error: error reason (500)');
    expect(wrapper.find('[data-test-subj="errorCalloutMessage"]').at(0).text()).toEqual(
      'Error fetching exception list'
    );
  });

  it('it invokes "onCancel" when cancel button clicked', () => {
    const mockOnCancel = jest.fn();
    const wrapper = mountWithIntl(
      <ErrorCallout
        http={mockKibanaHttpService}
        errorInfo={{
          reason: 'error reason',
          code: 500,
          details: null,
          listListId: null,
        }}
        rule={{ ...savedRuleMock, exceptions_list: [getListMock()] }}
        onCancel={mockOnCancel}
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="errorCalloutCancelButton"]').at(0).simulate('click');

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('it does not render status code if not available', () => {
    const wrapper = mountWithIntl(
      <ErrorCallout
        http={mockKibanaHttpService}
        errorInfo={{
          reason: 'not found',
          code: null,
          details: 'list of id "some_uuid" not found',
          listListId: null,
        }}
        rule={{ ...savedRuleMock, exceptions_list: [getListMock()] }}
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="errorCalloutContainer"] .euiCallOutHeader__title')
        .last()
        .text()
    ).toEqual('Error: not found');
    expect(wrapper.find('[data-test-subj="errorCalloutMessage"]').at(0).text()).toEqual(
      'Error fetching exception list'
    );
    expect(wrapper.find('[data-test-subj="errorCalloutDisassociateButton"]').exists()).toBeFalsy();
  });

  it('it renders specific missing exceptions list error', () => {
    const wrapper = mountWithIntl(
      <ErrorCallout
        http={mockKibanaHttpService}
        errorInfo={{
          reason: 'not found',
          code: 404,
          details: 'list of id "some_uuid" not found',
          listListId: null,
        }}
        rule={{ ...savedRuleMock, exceptions_list: [getListMock()] }}
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="errorCalloutContainer"] .euiCallOutHeader__title')
        .last()
        .text()
    ).toEqual('Error: not found (404)');
    expect(wrapper.find('[data-test-subj="errorCalloutMessage"]').at(0).text()).toEqual(
      'The associated exception list (some_uuid) no longer exists. Please remove the missing exception list to add additional exceptions to the detection rule.'
    );
    expect(wrapper.find('[data-test-subj="errorCalloutDisassociateButton"]').exists()).toBeTruthy();
  });

  it('it disassociates list from rule when remove exception list clicked ', () => {
    const wrapper = mountWithIntl(
      <ErrorCallout
        http={mockKibanaHttpService}
        errorInfo={{
          reason: 'not found',
          code: 404,
          details: 'list of id "some_uuid" not found',
          listListId: null,
        }}
        rule={{ ...savedRuleMock, exceptions_list: [getListMock()] }}
        onCancel={jest.fn()}
        onSuccess={jest.fn()}
        onError={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="errorCalloutDisassociateButton"]').at(0).simulate('click');

    expect(mockDisassociate).toHaveBeenCalledWith([]);
  });
});
