/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import '../../../common/mock/match_media';
import { Router, routeData, mockHistory, mockLocation } from '../__mock__/router';
import { CaseComponent, CaseProps, CaseView } from '.';
import { basicCase, basicCaseClosed, caseUserActions } from '../../containers/mock';
import { TestProviders } from '../../../common/mock';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCase } from '../../containers/use_get_case';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { act, waitFor } from '@testing-library/react';

import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/configure/mock';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ConnectorTypes } from '../../../../../case/common/api/connectors';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_user_actions');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../../detections/containers/detection_engine/alerts/use_query');
jest.mock('../user_action_tree/user_action_timestamp');

const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useGetCaseUserActionsMock = useGetCaseUserActions as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useQueryAlertsMock = useQueryAlerts as jest.Mock;

export const caseProps: CaseProps = {
  caseId: basicCase.id,
  userCanCrud: true,
  caseData: {
    ...basicCase,
    connector: {
      id: 'resilient-2',
      name: 'Resilient',
      type: ConnectorTypes.resilient,
      fields: null,
    },
  },
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
    useQueryAlertsMock.mockImplementation(() => ({
      isLoading: false,
      alerts: { hits: { hists: [] } },
    }));
  });

  it('should render CaseComponent', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="case-view-title"]`).first().prop('title')).toEqual(
        data.title
      );

      expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toEqual(
        'Open'
      );

      expect(
        wrapper
          .find(`[data-test-subj="case-view-tag-list"] [data-test-subj="tag-coke"]`)
          .first()
          .text()
      ).toEqual(data.tags[0]);

      expect(
        wrapper
          .find(`[data-test-subj="case-view-tag-list"] [data-test-subj="tag-pepsi"]`)
          .first()
          .text()
      ).toEqual(data.tags[1]);

      expect(wrapper.find(`[data-test-subj="case-view-username"]`).first().text()).toEqual(
        data.createdBy.username
      );

      expect(
        wrapper.find(`[data-test-subj="case-action-bar-status-date"]`).first().prop('value')
      ).toEqual(data.createdAt);

      expect(
        wrapper
          .find(`[data-test-subj="description-action"] [data-test-subj="user-action-markdown"]`)
          .first()
          .text()
      ).toBe(data.description);
    });
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

    await waitFor(() => {
      expect(
        wrapper.find(`[data-test-subj="case-action-bar-status-date"]`).first().prop('value')
      ).toEqual(basicCaseClosed.closedAt);
      expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toEqual(
        'Closed'
      );
    });
  });

  it('should dispatch update state when status is changed', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('[data-test-subj="case-view-status-dropdown"] button').first().simulate('click');
      wrapper.update();
      wrapper
        .find('button[data-test-subj="case-view-status-dropdown-closed"]')
        .first()
        .simulate('click');
      expect(updateCaseProperty).toHaveBeenCalled();
    });
  });

  it('should display EditableTitle isLoading', async () => {
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
    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="editable-title-loading"]').first().exists()
      ).toBeTruthy();
      expect(
        wrapper.find('[data-test-subj="editable-title-edit-icon"]').first().exists()
      ).toBeFalsy();
    });
  });

  it('should display description isLoading', async () => {
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
    await waitFor(() => {
      expect(
        wrapper
          .find(
            '[data-test-subj="description-action"] [data-test-subj="user-action-title-loading"]'
          )
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
  });

  it('should display tags isLoading', async () => {
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
    await waitFor(() => {
      expect(
        wrapper
          .find('[data-test-subj="case-view-tag-list"] [data-test-subj="tag-list-loading"]')
          .first()
          .exists()
      ).toBeTruthy();

      expect(wrapper.find('button[data-test-subj="tag-list-edit"]').first().exists()).toBeFalsy();
    });
  });

  it('should update title', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
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

    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="has-data-to-push-button"]').first().exists()
      ).toBeTruthy();

      wrapper.find('[data-test-subj="push-to-external-service"]').first().simulate('click');

      wrapper.update();

      expect(postPushToService).toHaveBeenCalled();
    });
  });

  it('should return null if error', async () => {
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
    await waitFor(() => {
      expect(wrapper).toEqual({});
    });
  });

  it('should return spinner if loading', async () => {
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
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-view-loading"]').exists()).toBeTruthy();
    });
  });

  it('should return case view when data is there', async () => {
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
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="case-view-title"]').exists()).toBeTruthy();
    });
  });

  it('should refresh data on refresh', async () => {
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
    await waitFor(() => {
      wrapper.find('[data-test-subj="case-refresh"]').first().simulate('click');
      expect(fetchCaseUserActions).toBeCalledWith(caseProps.caseData.id);
      expect(fetchCase).toBeCalled();
    });
  });

  it('should disable the push button when connector is invalid', async () => {
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
    await waitFor(() => {
      expect(
        wrapper.find('button[data-test-subj="push-to-external-service"]').first().prop('disabled')
      ).toBeTruthy();
    });
  });

  // TO DO fix when the useEffects in edit_connector are cleaned up
  it.skip('should revert to the initial connector in case of failure', async () => {
    updateCaseProperty.mockImplementation(({ onError }) => {
      onError();
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent
            {...caseProps}
            caseData={{
              ...caseProps.caseData,
              connector: {
                id: 'servicenow-1',
                name: 'SN 1',
                type: ConnectorTypes.servicenow,
                fields: null,
              },
            }}
          />
        </Router>
      </TestProviders>
    );
    const connectorName = wrapper
      .find('[data-test-subj="settings-connector-card"] .euiTitle')
      .first()
      .text();

    await waitFor(() => {
      wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');
    });

    await waitFor(() => {
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
      wrapper.update();
      wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');
    });

    await waitFor(() => {
      wrapper.update();
      const updateObject = updateCaseProperty.mock.calls[0][0];
      expect(updateObject.updateKey).toEqual('connector');
      expect(
        wrapper.find('[data-test-subj="settings-connector-card"] .euiTitle').first().text()
      ).toBe(connectorName);
    });
  });

  // TO DO fix when the useEffects in edit_connector are cleaned up
  it.skip('should update connector', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent
            {...caseProps}
            caseData={{
              ...caseProps.caseData,
              connector: {
                id: 'servicenow-1',
                name: 'SN 1',
                type: ConnectorTypes.servicenow,
                fields: null,
              },
            }}
          />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');
    });

    await waitFor(() => {
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
      wrapper.update();
    });

    act(() => {
      wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');
    });

    await waitFor(() => {
      wrapper.update();
    });

    const updateObject = updateCaseProperty.mock.calls[0][0];
    expect(updateObject.updateKey).toEqual('connector');
    expect(updateObject.updateValue).toEqual({
      id: 'resilient-2',
      name: 'My Connector 2',
      type: ConnectorTypes.resilient,
      fields: {
        incidentTypes: null,
        severityCode: null,
      },
    });
  });

  it('it should create a new timeline on mount', async () => {
    mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'x-pack/security_solution/local/timeline/CREATE_TIMELINE',
        payload: {
          columns: [],
          expandedEvent: {},
          id: 'timeline-case',
          indexNames: [],
          show: false,
        },
      });
    });
  });
});
