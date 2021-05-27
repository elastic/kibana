/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import '../../common/mock/match_media';
import { Router, mockHistory } from '../__mock__/router';
import { CaseComponent, CaseComponentProps, CaseView } from '.';
import {
  basicCase,
  basicCaseClosed,
  caseUserActions,
  alertComment,
  getAlertUserAction,
} from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCase } from '../../containers/use_get_case';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { waitFor } from '@testing-library/react';

import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/configure/mock';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { CaseType, ConnectorTypes } from '../../../common';

jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_user_actions');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../user_action_tree/user_action_timestamp');

const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useGetCaseUserActionsMock = useGetCaseUserActions as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;

const alertsHit = [
  {
    _id: 'alert-id-1',
    _index: 'alert-index-1',
    _source: {
      signal: {
        rule: {
          id: 'rule-id-1',
          name: 'Awesome rule',
        },
      },
    },
  },
  {
    _id: 'alert-id-2',
    _index: 'alert-index-2',
    _source: {
      signal: {
        rule: {
          id: 'rule-id-2',
          name: 'Awesome rule 2',
        },
      },
    },
  },
];

export const caseProps: CaseComponentProps = {
  allCasesNavigation: {
    href: 'all-cases-href',
    onClick: jest.fn(),
  },
  caseDetailsNavigation: {
    href: 'case-details-href',
    onClick: jest.fn(),
  },
  caseId: basicCase.id,
  configureCasesNavigation: {
    href: 'configure-cases-href',
    onClick: jest.fn(),
  },
  getCaseDetailHrefWithCommentId: jest.fn(),
  onComponentInitialized: jest.fn(),
  ruleDetailsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  showAlertDetails: jest.fn(),
  useFetchAlertData: () => [
    false,
    {
      'alert-id-1': alertsHit[0],
      'alert-id-2': alertsHit[1],
    },
  ],
  userCanCrud: true,
  caseData: {
    ...basicCase,
    comments: [...basicCase.comments, alertComment],
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

export const caseClosedProps: CaseComponentProps = {
  ...caseProps,
  caseData: basicCaseClosed,
};

describe('CaseView ', () => {
  const updateCaseProperty = jest.fn();
  const fetchCaseUserActions = jest.fn();
  const fetchCase = jest.fn();
  const updateCase = jest.fn();
  const pushCaseToExternalService = jest.fn();

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
    caseUserActions: [...caseUserActions, getAlertUserAction()],
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
    jest.clearAllMocks();
    useUpdateCaseMock.mockImplementation(() => defaultUpdateCaseState);
    useGetCaseUserActionsMock.mockImplementation(() => defaultUseGetCaseUserActions);
    usePostPushToServiceMock.mockImplementation(() => ({
      isLoading: false,
      pushCaseToExternalService,
    }));
    useConnectorsMock.mockImplementation(() => ({ connectors: connectorsMock, loading: false }));
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
    });

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

    expect(
      wrapper.find('button[data-test-subj="case-view-status-action-button"]').first().text()
    ).toBe('Mark in progress');
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

  it('should update status', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-view-status-dropdown"] button').first().simulate('click');
    wrapper
      .find('button[data-test-subj="case-view-status-dropdown-closed"]')
      .first()
      .simulate('click');

    await waitFor(() => {
      const updateObject = updateCaseProperty.mock.calls[0][0];
      expect(updateCaseProperty).toHaveBeenCalledTimes(1);
      expect(updateObject.updateKey).toEqual('status');
      expect(updateObject.updateValue).toEqual('closed');
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
    const newTitle = 'The new title';
    wrapper.find(`[data-test-subj="editable-title-edit-icon"]`).first().simulate('click');
    wrapper
      .find(`[data-test-subj="editable-title-input-field"]`)
      .last()
      .simulate('change', { target: { value: newTitle } });

    wrapper.find(`[data-test-subj="editable-title-submit-btn"]`).first().simulate('click');

    const updateObject = updateCaseProperty.mock.calls[0][0];
    await waitFor(() => {
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
    });
    wrapper.find('[data-test-subj="push-to-external-service"]').first().simulate('click');

    await waitFor(() => {
      expect(pushCaseToExternalService).toHaveBeenCalled();
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
              allCasesNavigation: {
                href: 'all-cases-href',
                onClick: jest.fn(),
              },
              caseDetailsNavigation: {
                href: 'case-details-href',
                onClick: jest.fn(),
              },
              caseId: '1234',
              configureCasesNavigation: {
                href: 'configure-cases-href',
                onClick: jest.fn(),
              },
              getCaseDetailHrefWithCommentId: jest.fn(),
              onComponentInitialized: jest.fn(),
              ruleDetailsNavigation: {
                href: jest.fn(),
                onClick: jest.fn(),
              },
              showAlertDetails: jest.fn(),
              useFetchAlertData: jest.fn().mockReturnValue([false, alertsHit[0]]),
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
              allCasesNavigation: {
                href: 'all-cases-href',
                onClick: jest.fn(),
              },
              caseDetailsNavigation: {
                href: 'case-details-href',
                onClick: jest.fn(),
              },
              caseId: '1234',
              configureCasesNavigation: {
                href: 'configure-cases-href',
                onClick: jest.fn(),
              },
              getCaseDetailHrefWithCommentId: jest.fn(),
              onComponentInitialized: jest.fn(),
              ruleDetailsNavigation: {
                href: jest.fn(),
                onClick: jest.fn(),
              },
              showAlertDetails: jest.fn(),
              useFetchAlertData: jest.fn().mockReturnValue([false, alertsHit[0]]),
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
              allCasesNavigation: {
                href: 'all-cases-href',
                onClick: jest.fn(),
              },
              caseDetailsNavigation: {
                href: 'case-details-href',
                onClick: jest.fn(),
              },
              caseId: '1234',
              configureCasesNavigation: {
                href: 'configure-cases-href',
                onClick: jest.fn(),
              },
              getCaseDetailHrefWithCommentId: jest.fn(),
              onComponentInitialized: jest.fn(),
              ruleDetailsNavigation: {
                href: jest.fn(),
                onClick: jest.fn(),
              },
              showAlertDetails: jest.fn(),
              useFetchAlertData: jest.fn().mockReturnValue([false, alertsHit[0]]),
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
              allCasesNavigation: {
                href: 'all-cases-href',
                onClick: jest.fn(),
              },
              caseDetailsNavigation: {
                href: 'case-details-href',
                onClick: jest.fn(),
              },
              caseId: '1234',
              configureCasesNavigation: {
                href: 'configure-cases-href',
                onClick: jest.fn(),
              },
              getCaseDetailHrefWithCommentId: jest.fn(),
              onComponentInitialized: jest.fn(),
              ruleDetailsNavigation: {
                href: jest.fn(),
                onClick: jest.fn(),
              },
              showAlertDetails: jest.fn(),
              useFetchAlertData: jest.fn().mockReturnValue([false, alertsHit[0]]),
              userCanCrud: true,
            }}
          />
        </Router>
      </TestProviders>
    );
    wrapper.find('[data-test-subj="case-refresh"]').first().simulate('click');
    await waitFor(() => {
      expect(fetchCaseUserActions).toBeCalledWith('1234', 'resilient-2', undefined);
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

  // TODO: fix when the useEffects in edit_connector are cleaned up
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
                type: ConnectorTypes.serviceNowITSM,
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

    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');
    await waitFor(() => wrapper.update());
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    await waitFor(() => wrapper.update());
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    await waitFor(() => wrapper.update());
    wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');

    await waitFor(() => {
      wrapper.update();
      const updateObject = updateCaseProperty.mock.calls[0][0];
      expect(updateObject.updateKey).toEqual('connector');
      expect(
        wrapper.find('[data-test-subj="settings-connector-card"] .euiTitle').first().text()
      ).toBe(connectorName);
    });
  });
  it('should update connector', async () => {
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
                type: ConnectorTypes.serviceNowITSM,
                fields: null,
              },
            }}
          />
        </Router>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');

    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');

    await waitFor(() => wrapper.update());
    wrapper.find(`button[data-test-subj="edit-connectors-submit"]`).first().simulate('click');

    await waitFor(() => {
      const updateObject = updateCaseProperty.mock.calls[0][0];
      expect(updateCaseProperty).toHaveBeenCalledTimes(1);
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
  });

  it('it should call onComponentInitialized on mount', async () => {
    const onComponentInitialized = jest.fn();
    mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} onComponentInitialized={onComponentInitialized} />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      expect(onComponentInitialized).toHaveBeenCalled();
    });
  });

  it('should show loading content when loading alerts', async () => {
    const useFetchAlertData = jest.fn().mockReturnValue([true]);
    useGetCaseUserActionsMock.mockReturnValue({
      caseServices: {},
      caseUserActions: [],
      hasDataToPush: false,
      isError: false,
      isLoading: true,
      participants: [],
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} useFetchAlertData={useFetchAlertData} />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="case-view-loading-content"]').first().exists()
      ).toBeTruthy();
      expect(wrapper.find('[data-test-subj="user-actions"]').first().exists()).toBeFalsy();
    });
  });

  it('should call show alert details with expected arguments', async () => {
    const showAlertDetails = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} showAlertDetails={showAlertDetails} />
        </Router>
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="comment-action-show-alert-alert-action-id"] button')
      .first()
      .simulate('click');
    await waitFor(() => {
      expect(showAlertDetails).toHaveBeenCalledWith('alert-id-1', 'alert-index-1');
    });
  });

  it('should show the rule name', async () => {
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
            '[data-test-subj="comment-create-action-alert-action-id"] .euiCommentEvent__headerEvent'
          )
          .first()
          .text()
      ).toBe('added an alert from Awesome rule');
    });
  });

  it('should update settings', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...caseProps} />
        </Router>
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="sync-alerts-switch"]').first().simulate('click');
    await waitFor(() => {
      wrapper.update();
      const updateObject = updateCaseProperty.mock.calls[0][0];
      expect(updateObject.updateKey).toEqual('settings');
      expect(updateObject.updateValue).toEqual({ syncAlerts: false });
    });
  });

  it('should show the correct connector name on the push button', async () => {
    useConnectorsMock.mockImplementation(() => ({ connectors: connectorsMock, loading: false }));
    useGetCaseUserActionsMock.mockImplementation(() => ({
      ...defaultUseGetCaseUserActions,
      hasDataToPush: true,
    }));

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <CaseComponent {...{ ...caseProps, connector: { ...caseProps, name: 'old-name' } }} />
        </Router>
      </TestProviders>
    );

    await waitFor(() => {
      expect(
        wrapper
          .find('[data-test-subj="has-data-to-push-button"]')
          .first()
          .text()
          .includes('My Connector 2')
      ).toBe(true);
    });
  });

  describe('Callouts', () => {
    it('it shows the danger callout when a connector has been deleted', async () => {
      useConnectorsMock.mockImplementation(() => ({ connectors: [], loading: false }));
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <CaseComponent {...caseProps} />
          </Router>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find('.euiCallOut--danger').first().exists()).toBeTruthy();
      });
    });

    it('it does NOT shows the danger callout when connectors are loading', async () => {
      useConnectorsMock.mockImplementation(() => ({ connectors: [], loading: true }));
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <CaseComponent {...caseProps} />
          </Router>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find('.euiCallOut--danger').first().exists()).toBeFalsy();
      });
    });
  });

  describe('Collections', () => {
    it('it does not allow the user to update the status', async () => {
      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <CaseComponent
              {...caseProps}
              caseData={{ ...caseProps.caseData, type: CaseType.collection }}
            />
          </Router>
        </TestProviders>
      );

      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="case-action-bar-wrapper"]').exists()).toBe(true);
        expect(wrapper.find('button[data-test-subj="case-view-status"]').exists()).toBe(false);
        expect(wrapper.find('[data-test-subj="user-actions"]').exists()).toBe(true);
        expect(
          wrapper.find('button[data-test-subj="case-view-status-action-button"]').exists()
        ).toBe(false);
      });
    });

    it('it shows the push button when has data to push', async () => {
      useGetCaseUserActionsMock.mockImplementation(() => ({
        ...defaultUseGetCaseUserActions,
        hasDataToPush: true,
      }));

      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <CaseComponent
              {...caseProps}
              caseData={{ ...caseProps.caseData, type: CaseType.collection }}
            />
          </Router>
        </TestProviders>
      );

      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="has-data-to-push-button"]').exists()).toBe(true);
      });
    });

    it('it does not show the horizontal rule when does NOT has data to push', async () => {
      useGetCaseUserActionsMock.mockImplementation(() => ({
        ...defaultUseGetCaseUserActions,
        hasDataToPush: false,
      }));

      const wrapper = mount(
        <TestProviders>
          <Router history={mockHistory}>
            <CaseComponent
              {...caseProps}
              caseData={{ ...caseProps.caseData, type: CaseType.collection }}
            />
          </Router>
        </TestProviders>
      );

      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="case-view-bottom-actions-horizontal-rule"]').exists()
        ).toBe(false);
      });
    });
  });
});
