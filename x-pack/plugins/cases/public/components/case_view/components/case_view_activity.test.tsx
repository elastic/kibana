/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertComment,
  basicCase,
  caseUserActions,
  connectorsMock,
  getAlertUserAction,
} from '../../../containers/mock';
import React from 'react';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer, noUpdateCasesPermissions } from '../../../common/mock';
import { CaseViewActivity } from './case_view_activity';
import { ConnectorTypes } from '../../../../common/api/connectors';
import type { Case } from '../../../../common';
import type { CaseViewProps } from '../types';
import { useGetCaseUserActions } from '../../../containers/use_get_case_user_actions';
import { usePostPushToService } from '../../../containers/use_post_push_to_service';
import { useGetConnectors } from '../../../containers/configure/use_connectors';
import { useGetTags } from '../../../containers/use_get_tags';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { waitForComponentToUpdate } from '../../../common/test_utils';

jest.mock('../../../containers/use_get_case_user_actions');
jest.mock('../../../containers/configure/use_connectors');
jest.mock('../../../containers/use_post_push_to_service');
jest.mock('../../user_actions/timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../../common/navigation/hooks');
jest.mock('../../../containers/use_get_action_license');
jest.mock('../../../containers/use_get_tags');
jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles');

(useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });

const caseData: Case = {
  ...basicCase,
  comments: [...basicCase.comments, alertComment],
  connector: {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  },
};

const caseViewProps: CaseViewProps = {
  onComponentInitialized: jest.fn(),
  actionsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  ruleDetailsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  showAlertDetails: jest.fn(),
  useFetchAlertData: () => [
    false,
    {
      'alert-id-1': '1234',
      'alert-id-2': '1234',
    },
  ],
};
const fetchCaseUserActions = jest.fn();
const pushCaseToExternalService = jest.fn();

const defaultUseGetCaseUserActions = {
  data: {
    caseUserActions: [...caseUserActions, getAlertUserAction()],
    caseServices: {},
    hasDataToPush: false,
    participants: [caseData.createdBy],
  },
  refetch: fetchCaseUserActions,
  isLoading: false,
  isError: false,
};

export const caseProps = {
  ...caseViewProps,
  caseData,
  fetchCaseMetrics: jest.fn(),
};

const useGetCaseUserActionsMock = useGetCaseUserActions as jest.Mock;
const useGetConnectorsMock = useGetConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

describe('Case View Page activity tab', () => {
  beforeAll(() => {
    useGetCaseUserActionsMock.mockReturnValue(defaultUseGetCaseUserActions);
    useGetConnectorsMock.mockReturnValue({ data: connectorsMock, isLoading: false });
    usePostPushToServiceMock.mockReturnValue({ isLoading: false, pushCaseToExternalService });
    useBulkGetUserProfilesMock.mockReturnValue({ isLoading: false, data: new Map() });
  });
  let appMockRender: AppMockRenderer;

  const platinumLicense = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  const basicLicense = licensingMock.createLicense({
    license: { type: 'basic' },
  });

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('should render the activity content and main components', async () => {
    appMockRender = createAppMockRenderer({ license: platinumLicense });
    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);

    expect(result.getByTestId('case-view-activity')).toBeTruthy();
    expect(result.getByTestId('user-actions')).toBeTruthy();
    expect(result.getByTestId('case-tags')).toBeTruthy();
    expect(result.getByTestId('connector-edit-header')).toBeTruthy();
    expect(result.getByTestId('case-view-status-action-button')).toBeTruthy();
    expect(useGetCaseUserActionsMock).toHaveBeenCalledWith(caseData.id, caseData.connector.id);

    await waitForComponentToUpdate();
  });

  it('should not render the case view status button when the user does not have update permissions', async () => {
    appMockRender = createAppMockRenderer({
      permissions: noUpdateCasesPermissions(),
      license: platinumLicense,
    });

    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(result.getByTestId('case-view-activity')).toBeTruthy();
    expect(result.getByTestId('user-actions')).toBeTruthy();
    expect(result.getByTestId('case-tags')).toBeTruthy();
    expect(result.getByTestId('connector-edit-header')).toBeTruthy();
    expect(result.queryByTestId('case-view-status-action-button')).not.toBeInTheDocument();
    expect(useGetCaseUserActionsMock).toHaveBeenCalledWith(caseData.id, caseData.connector.id);

    await waitForComponentToUpdate();
  });

  it('should disable the severity selector when the user does not have update permissions', async () => {
    appMockRender = createAppMockRenderer({
      permissions: noUpdateCasesPermissions(),
      license: platinumLicense,
    });

    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(result.getByTestId('case-view-activity')).toBeTruthy();
    expect(result.getByTestId('user-actions')).toBeTruthy();
    expect(result.getByTestId('case-tags')).toBeTruthy();
    expect(result.getByTestId('connector-edit-header')).toBeTruthy();
    expect(result.getByTestId('case-severity-selection')).toBeDisabled();
    expect(useGetCaseUserActionsMock).toHaveBeenCalledWith(caseData.id, caseData.connector.id);

    await waitForComponentToUpdate();
  });

  it('should show a loading when is fetching data is true and hide the user actions activity', () => {
    useGetCaseUserActionsMock.mockReturnValue({
      ...defaultUseGetCaseUserActions,
      isFetching: true,
      isLoading: true,
    });
    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(result.getByTestId('case-view-loading-content')).toBeTruthy();
    expect(result.queryByTestId('case-view-activity')).toBeFalsy();
    expect(useGetCaseUserActionsMock).toHaveBeenCalledWith(caseData.id, caseData.connector.id);
  });

  it('should not render the assignees on basic license', () => {
    appMockRender = createAppMockRenderer({ license: basicLicense });

    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(result.queryByTestId('case-view-assignees')).toBeNull();
  });

  it('should render the assignees on platinum license', async () => {
    appMockRender = createAppMockRenderer({ license: platinumLicense });

    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(result.getByTestId('case-view-assignees')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('should not render the connector on basic license', () => {
    appMockRender = createAppMockRenderer({ license: basicLicense });

    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);
    expect(result.queryByTestId('case-view-edit-connector')).toBeNull();
  });

  it('should render the connector on platinum license', async () => {
    appMockRender = createAppMockRenderer({ license: platinumLicense });

    const result = appMockRender.render(<CaseViewActivity {...caseProps} />);

    expect(result.getByTestId('case-view-edit-connector')).toBeInTheDocument();
    await waitForComponentToUpdate();
  });
});
