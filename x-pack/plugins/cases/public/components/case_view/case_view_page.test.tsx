/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import '../../common/mock/match_media';
import { CaseViewPage } from './case_view_page';
import { CaseViewPageProps } from './types';
import {
  basicCaseClosed,
  basicCaseMetrics,
  caseUserActions,
  getAlertUserAction,
} from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';

import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/configure/mock';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';
import { ConnectorTypes } from '../../../common/api';
import { caseViewProps, caseData } from './index.test';

jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_case_metrics');
jest.mock('../../containers/use_get_case_user_actions');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../user_actions/timestamp');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useGetCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useGetCaseUserActionsMock = useGetCaseUserActions as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;

export const caseProps: CaseViewPageProps = {
  ...caseViewProps,
  caseId: caseData.id,
  caseData,
  fetchCase: jest.fn(),
  updateCase: jest.fn(),
};

export const caseClosedProps: CaseViewPageProps = {
  ...caseProps,
  caseData: basicCaseClosed,
};

describe('CaseViewPage', () => {
  const updateCaseProperty = jest.fn();
  const fetchCaseUserActions = jest.fn();
  const pushCaseToExternalService = jest.fn();
  const fetchCaseMetrics = jest.fn();

  const data = caseProps.caseData;

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

  const defaultGetCaseMetrics = {
    isLoading: false,
    isError: false,
    metrics: basicCaseMetrics,
    fetchCaseMetrics,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateCaseMock.mockReturnValue(defaultUpdateCaseState);
    useGetCaseMetricsMock.mockReturnValue(defaultGetCaseMetrics);
    useGetCaseUserActionsMock.mockReturnValue(defaultUseGetCaseUserActions);
    usePostPushToServiceMock.mockReturnValue({ isLoading: false, pushCaseToExternalService });
    useConnectorsMock.mockReturnValue({ connectors: connectorsMock, loading: false });
  });

  it('should render CaseViewPage', async () => {
    const wrapper = mount(
      <TestProviders>
        <CaseViewPage {...caseProps} />
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

    expect(wrapper.find(`[data-test-subj="case-view-metrics"]`).exists()).toBeFalsy();

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
      wrapper
        .find(`[data-test-subj="description-action"] [data-test-subj="user-action-markdown"]`)
        .first()
        .text()
    ).toBe(data.description);

    expect(
      wrapper.find('button[data-test-subj="case-view-status-action-button"]').first().text()
    ).toBe('Mark in progress');
  });

  it('should render CaseViewPage with metrics', async () => {
    const wrapper = mount(
      <TestProviders features={{ metrics: ['alerts.count'] }}>
        <CaseViewPage {...caseProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="case-view-metrics"]`).exists()).toBeTruthy();
    });
  });

  it('should show closed indicators in header when case is closed', async () => {
    useUpdateCaseMock.mockImplementation(() => ({
      ...defaultUpdateCaseState,
      caseData: basicCaseClosed,
    }));

    const wrapper = mount(
      <TestProviders>
        <CaseViewPage {...caseClosedProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toEqual(
        'Closed'
      );
    });
  });

  it('should update status', async () => {
    const wrapper = mount(
      <TestProviders>
        <CaseViewPage {...caseProps} />
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
        <CaseViewPage {...caseProps} />
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
        <CaseViewPage {...caseProps} />
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
        <CaseViewPage {...caseProps} />
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
        <CaseViewPage {...caseProps} />
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
        <CaseViewPage {...caseProps} />
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

  it('should disable the push button when connector is invalid', async () => {
    useGetCaseUserActionsMock.mockImplementation(() => ({
      ...defaultUseGetCaseUserActions,
      hasDataToPush: true,
    }));

    const wrapper = mount(
      <TestProviders>
        <CaseViewPage
          {...{
            ...caseProps,
            caseData: { ...caseProps.caseData, connectorId: 'not-exist' },
          }}
        />
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
        <CaseViewPage
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
        <CaseViewPage
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
      </TestProviders>
    );

    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="connector-fields-resilient"]`).exists()).toBeTruthy();
    });

    wrapper.find(`button[data-test-subj="edit-connectors-submit"]`).first().simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(updateCaseProperty).toHaveBeenCalledTimes(1);
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
  });

  it('it should call onComponentInitialized on mount', async () => {
    const onComponentInitialized = jest.fn();
    mount(
      <TestProviders>
        <CaseViewPage {...caseProps} onComponentInitialized={onComponentInitialized} />
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
        <CaseViewPage {...caseProps} useFetchAlertData={useFetchAlertData} />
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
        <CaseViewPage {...caseProps} showAlertDetails={showAlertDetails} />
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
        <CaseViewPage {...caseProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(
        wrapper
          .find(
            '[data-test-subj="user-action-alert-comment-create-action-alert-action-id"] .euiCommentEvent__headerEvent'
          )
          .first()
          .text()
      ).toBe('added an alert from Awesome rule');
    });
  });

  it('should update settings', async () => {
    const wrapper = mount(
      <TestProviders>
        <CaseViewPage {...caseProps} />
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
        <CaseViewPage {...{ ...caseProps, connector: { ...caseProps, name: 'old-name' } }} />
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
          <CaseViewPage {...caseProps} />
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
          <CaseViewPage {...caseProps} />
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find('.euiCallOut--danger').first().exists()).toBeFalsy();
      });
    });
  });
});
