/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { Router, routeData, mockHistory, mockLocation } from '../__mock__/router';
import { CaseComponent, CaseProps, CaseView } from '.';
import { basicCase, basicCaseClosed, caseUserActions } from '../../containers/mock';
import { TestProviders } from '../../../common/mock';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCase } from '../../containers/use_get_case';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { wait } from '../../../common/lib/helpers';

import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/configure/mock';

import { usePostPushToService } from '../../containers/use_post_push_to_service';

jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_user_actions');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/use_post_push_to_service');

const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useGetCaseUserActionsMock = useGetCaseUserActions as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;

export const caseProps: CaseProps = {
  caseId: basicCase.id,
  userCanCrud: true,
  caseData: { ...basicCase, connectorId: 'servicenow-2' },
  fetchCase: jest.fn(),
  updateCase: jest.fn(),
};

export const caseClosedProps: CaseProps = {
  ...caseProps,
  caseData: basicCaseClosed,
};

describe('CaseView ', () => {
  const updateCaseProperty = jest.fn();
  const fetchCaseUserActions = jest.fn();
  const fetchCase = jest.fn();
  const updateCase = jest.fn();
  const postPushToService = jest.fn();

  const data = caseProps.caseData;
  const defaultGetCase = {
    isLoading: false,
    isError: false,
    data,
    updateCase,
    fetchCase,
  };
  /* eslint-disable no-console */
  // Silence until enzyme fixed to use ReactTestUtils.act()
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  /* eslint-enable no-console */

  const defaultUpdateCaseState = {
    isLoading: false,
    isError: false,
    updateKey: null,
    updateCaseProperty,
  };

  const defaultUseGetCaseUserActions = {
    caseUserActions,
    caseServices: {},
    fetchCaseUserActions,
    firstIndexPushToService: -1,
    hasDataToPush: false,
    isLoading: false,
    isError: false,
    lastIndexPushToService: -1,
    participants: [data.createdBy],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useUpdateCaseMock.mockImplementation(() => defaultUpdateCaseState);
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
    useGetCaseUserActionsMock.mockImplementation(() => defaultUseGetCaseUserActions);
    usePostPushToServiceMock.mockImplementation(() => ({ isLoading: false, postPushToService }));
    useConnectorsMock.mockImplementation(() => ({ connectors: connectorsMock, isLoading: false }));
  });

  it('should render CaseComponent', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    await wait();
    expect(wrapper.find(`[data-test-subj="case-view-title"]`).first().prop('title')).toEqual(
      data.title
    );
    expect(wrapper.find(`[data-test-subj="case-view-status"]`).first().text()).toEqual(data.status);
    expect(
      wrapper
        .find(`[data-test-subj="case-view-tag-list"] [data-test-subj="case-tag"]`)
        .first()
        .text()
    ).toEqual(data.tags[0]);
    expect(wrapper.find(`[data-test-subj="case-view-username"]`).first().text()).toEqual(
      data.createdBy.username
    );
    expect(wrapper.contains(`[data-test-subj="case-view-closedAt"]`)).toBe(false);
    expect(wrapper.find(`[data-test-subj="case-view-createdAt"]`).first().prop('value')).toEqual(
      data.createdAt
    );
    expect(
      wrapper
        .find(`[data-test-subj="description-action"] [data-test-subj="user-action-markdown"]`)
        .first()
        .prop('raw')
    ).toEqual(data.description);
  });

  it('should show closed indicators in header when case is closed', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      caseData: basicCaseClosed,
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseClosedProps} />
        </Router>
      </TestProviders>
    );
    await wait();
    expect(wrapper.contains(`[data-test-subj="case-view-createdAt"]`)).toBe(false);
    expect(wrapper.find(`[data-test-subj="case-view-closedAt"]`).first().prop('value')).toEqual(
      basicCaseClosed.closedAt
    );
    expect(wrapper.find(`[data-test-subj="case-view-status"]`).first().text()).toEqual(
      basicCaseClosed.status
    );
  });

  it('should dispatch update state when button is toggled', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    await wait();
    wrapper
      .find('input[data-test-subj="toggle-case-status"]')
      .simulate('change', { target: { checked: true } });
    expect(updateCaseProperty).toHaveBeenCalled();
  });

  it('should display EditableTitle isLoading', () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'title',
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="editable-title-loading"]').first().exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="editable-title-edit-icon"]').first().exists()
    ).toBeFalsy();
  });

  it('should display Toggle Status isLoading', () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'status',
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper.find('[data-test-subj="toggle-case-status"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  it('should display description isLoading', () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'description',
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="description-action"] [data-test-subj="user-action-title-loading"]')
        .first()
        .exists()
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="description-action"] [data-test-subj="property-actions"]')
        .first()
        .exists()
    ).toBeFalsy();
  });

  it('should display tags isLoading', () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      isLoading: true,
      updateKey: 'tags',
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="case-view-tag-list"] [data-test-subj="tag-list-loading"]')
        .first()
        .exists()
    ).toBeTruthy();
    expect(wrapper.find('[data-test-subj="tag-list-edit"]').first().exists()).toBeFalsy();
  });

  it('should update title', () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    const newTitle = 'The new title';
    wrapper.find(`[data-test-subj="editable-title-edit-icon"]`).first().simulate('click');
    wrapper.update();
    wrapper
      .find(`[data-test-subj="editable-title-input-field"]`)
      .last()
      .simulate('change', { target: { value: newTitle } });

    wrapper.update();
    wrapper.find(`[data-test-subj="editable-title-submit-btn"]`).first().simulate('click');

    wrapper.update();
    const updateObject = updateCaseProperty.mock.calls[0][0];
    expect(updateObject.updateKey).toEqual('title');
    expect(updateObject.updateValue).toEqual(newTitle);
  });

  it('should push updates on button click', async () => {
    useGetCaseUserActionsMock.mockImplementation(() => ({
      ...defaultUseGetCaseUserActions,
      hasDataToPush: true,
    }));

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...{ ...caseProps, updateCase }} />
        </Router>
      </TestProviders>
    );

    await wait();

    expect(
      wrapper.find('[data-test-subj="has-data-to-push-button"]').first().exists()
    ).toBeTruthy();

    wrapper.find('[data-test-subj="push-to-external-service"]').first().simulate('click');

    wrapper.update();

    expect(postPushToService).toHaveBeenCalled();
  });

  it('should return null if error', () => {
    (useGetCase as jest.Mock).mockImplementation(() => ({
      ...defaultGetCase,
      isError: true,
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseView
            {...{
              caseId: '1234',
              userCanCrud: true,
            }}
          />
        </Router>
      </TestProviders>
    );
    expect(wrapper).toEqual({});
  });

  it('should return spinner if loading', () => {
    (useGetCase as jest.Mock).mockImplementation(() => ({
      ...defaultGetCase,
      isLoading: true,
    }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseView
            {...{
              caseId: '1234',
              userCanCrud: true,
            }}
          />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="case-view-loading"]').exists()).toBeTruthy();
  });

  it('should return case view when data is there', () => {
    (useGetCase as jest.Mock).mockImplementation(() => defaultGetCase);
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseView
            {...{
              caseId: '1234',
              userCanCrud: true,
            }}
          />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="case-view-title"]').exists()).toBeTruthy();
  });

  it('should refresh data on refresh', () => {
    (useGetCase as jest.Mock).mockImplementation(() => defaultGetCase);
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseView
            {...{
              caseId: '1234',
              userCanCrud: true,
            }}
          />
        </Router>
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-refresh"]').first().simulate('click');
    expect(fetchCaseUserActions).toBeCalledWith(caseProps.caseData.id);
    expect(fetchCase).toBeCalled();
  });

  it('should disable the push button when connector is invalid', () => {
    useGetCaseUserActionsMock.mockImplementation(() => ({
      ...defaultUseGetCaseUserActions,
      hasDataToPush: true,
    }));

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent
            {...{
              ...caseProps,
              updateCase,
              caseData: { ...caseProps.caseData, connectorId: 'not-exist' },
            }}
          />
        </Router>
      </TestProviders>
    );

    expect(
      wrapper.find('button[data-test-subj="push-to-external-service"]').first().prop('disabled')
    ).toBeTruthy();
  });
});
