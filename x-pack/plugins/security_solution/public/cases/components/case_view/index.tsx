/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonToggle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiLoadingSpinner,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import * as i18n from './translations';
import { Case } from '../../containers/types';
import { getCaseUrl } from '../../../common/components/link_to';
import { gutterTimeline } from '../../../common/lib/helpers';
import { HeaderPage } from '../../../common/components/header_page';
import { EditableTitle } from '../../../common/components/header_page/editable_title';
import { TagList } from '../tag_list';
import { useGetCase } from '../../containers/use_get_case';
import { UserActionTree } from '../user_action_tree';
import { UserList } from '../user_list';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';
import { getTypedPayload } from '../../containers/utils';
import { WhitePageWrapper, HeaderWrapper } from '../wrappers';
import { useBasePath } from '../../../common/lib/kibana';
import { CaseStatus } from '../case_status';
import { navTabs } from '../../../app/home/home_navigations';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useGetCaseUserActions } from '../../containers/use_get_case_user_actions';
import { usePushToService } from '../use_push_to_service';
import { EditConnector } from '../edit_connector';
import { useConnectors } from '../../containers/configure/use_connectors';
import { SecurityPageName } from '../../../app/types';

interface Props {
  caseId: string;
  userCanCrud: boolean;
}

const MyWrapper = styled.div`
  padding: ${({
    theme,
  }) => `${theme.eui.paddingSizes.l} ${gutterTimeline} ${theme.eui.paddingSizes.l}
  ${theme.eui.paddingSizes.l}`};
`;

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const MyEuiHorizontalRule = styled(EuiHorizontalRule)`
  margin-left: 48px;
  &.euiHorizontalRule--full {
    width: calc(100% - 48px);
  }
`;

export interface CaseProps extends Props {
  fetchCase: () => void;
  caseData: Case;
  updateCase: (newCase: Case) => void;
}

export const CaseComponent = React.memo<CaseProps>(
  ({ caseId, caseData, fetchCase, updateCase, userCanCrud }) => {
    const basePath = window.location.origin + useBasePath();
    const caseLink = `${basePath}/app/security/cases/${caseId}`;
    const search = useGetUrlSearch(navTabs.case);
    const [initLoadingData, setInitLoadingData] = useState(true);
    const {
      caseUserActions,
      fetchCaseUserActions,
      caseServices,
      hasDataToPush,
      isLoading: isLoadingUserActions,
      participants,
    } = useGetCaseUserActions(caseId, caseData.connectorId);
    const { isLoading, updateKey, updateCaseProperty } = useUpdateCase({
      caseId,
    });

    // Update Fields
    const onUpdateField = useCallback(
      (newUpdateKey: keyof Case, updateValue: Case[keyof Case]) => {
        const handleUpdateNewCase = (newCase: Case) =>
          updateCase({ ...newCase, comments: caseData.comments });
        switch (newUpdateKey) {
          case 'title':
            const titleUpdate = getTypedPayload<string>(updateValue);
            if (titleUpdate.length > 0) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'title',
                updateValue: titleUpdate,
                updateCase: handleUpdateNewCase,
                version: caseData.version,
              });
            }
            break;
          case 'connectorId':
            const connectorId = getTypedPayload<string>(updateValue);
            if (connectorId.length > 0) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'connector_id',
                updateValue: connectorId,
                updateCase: handleUpdateNewCase,
                version: caseData.version,
              });
            }
            break;
          case 'description':
            const descriptionUpdate = getTypedPayload<string>(updateValue);
            if (descriptionUpdate.length > 0) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'description',
                updateValue: descriptionUpdate,
                updateCase: handleUpdateNewCase,
                version: caseData.version,
              });
            }
            break;
          case 'tags':
            const tagsUpdate = getTypedPayload<string[]>(updateValue);
            updateCaseProperty({
              fetchCaseUserActions,
              updateKey: 'tags',
              updateValue: tagsUpdate,
              updateCase: handleUpdateNewCase,
              version: caseData.version,
            });
            break;
          case 'status':
            const statusUpdate = getTypedPayload<string>(updateValue);
            if (caseData.status !== updateValue) {
              updateCaseProperty({
                fetchCaseUserActions,
                updateKey: 'status',
                updateValue: statusUpdate,
                updateCase: handleUpdateNewCase,
                version: caseData.version,
              });
            }
          default:
            return null;
        }
      },
      [fetchCaseUserActions, updateCaseProperty, updateCase, caseData]
    );
    const handleUpdateCase = useCallback(
      (newCase: Case) => {
        updateCase(newCase);
        fetchCaseUserActions(newCase.id);
      },
      [updateCase, fetchCaseUserActions]
    );

    const { loading: isLoadingConnectors, connectors } = useConnectors();

    const [caseConnectorName, isValidConnector] = useMemo(() => {
      const connector = connectors.find((c) => c.id === caseData.connectorId);
      return [connector?.name ?? 'none', !!connector];
    }, [connectors, caseData.connectorId]);

    const currentExternalIncident = useMemo(
      () =>
        caseServices != null && caseServices[caseData.connectorId] != null
          ? caseServices[caseData.connectorId]
          : null,
      [caseServices, caseData.connectorId]
    );

    const { pushButton, pushCallouts } = usePushToService({
      caseConnectorId: caseData.connectorId,
      caseConnectorName,
      caseServices,
      caseId: caseData.id,
      caseStatus: caseData.status,
      connectors,
      updateCase: handleUpdateCase,
      userCanCrud,
      isValidConnector,
    });

    const onSubmitConnector = useCallback(
      (connectorId) => onUpdateField('connectorId', connectorId),
      [onUpdateField]
    );
    const onSubmitTags = useCallback((newTags) => onUpdateField('tags', newTags), [onUpdateField]);
    const onSubmitTitle = useCallback((newTitle) => onUpdateField('title', newTitle), [
      onUpdateField,
    ]);
    const toggleStatusCase = useCallback(
      (e) => onUpdateField('status', e.target.checked ? 'closed' : 'open'),
      [onUpdateField]
    );
    const handleRefresh = useCallback(() => {
      fetchCaseUserActions(caseData.id);
      fetchCase();
    }, [caseData.id, fetchCase, fetchCaseUserActions]);

    const spyState = useMemo(() => ({ caseTitle: caseData.title }), [caseData.title]);

    const caseStatusData = useMemo(
      () =>
        caseData.status === 'open'
          ? {
              'data-test-subj': 'case-view-createdAt',
              value: caseData.createdAt,
              title: i18n.CASE_OPENED,
              buttonLabel: i18n.CLOSE_CASE,
              status: caseData.status,
              icon: 'folderCheck',
              badgeColor: 'secondary',
              isSelected: false,
            }
          : {
              'data-test-subj': 'case-view-closedAt',
              value: caseData.closedAt ?? '',
              title: i18n.CASE_CLOSED,
              buttonLabel: i18n.REOPEN_CASE,
              status: caseData.status,
              icon: 'folderExclamation',
              badgeColor: 'danger',
              isSelected: true,
            },
      [caseData.closedAt, caseData.createdAt, caseData.status]
    );
    const emailContent = useMemo(
      () => ({
        subject: i18n.EMAIL_SUBJECT(caseData.title),
        body: i18n.EMAIL_BODY(caseLink),
      }),
      [caseLink, caseData.title]
    );

    useEffect(() => {
      if (initLoadingData && !isLoadingUserActions) {
        setInitLoadingData(false);
      }
    }, [initLoadingData, isLoadingUserActions]);

    const backOptions = useMemo(
      () => ({
        href: getCaseUrl(search),
        text: i18n.BACK_TO_ALL,
        dataTestSubj: 'backToCases',
        pageId: SecurityPageName.case,
      }),
      [search]
    );

    return (
      <>
        <HeaderWrapper>
          <HeaderPage
            backOptions={backOptions}
            data-test-subj="case-view-title"
            titleNode={
              <EditableTitle
                disabled={!userCanCrud}
                isLoading={isLoading && updateKey === 'title'}
                title={caseData.title}
                onSubmit={onSubmitTitle}
              />
            }
            title={caseData.title}
          >
            <CaseStatus
              currentExternalIncident={currentExternalIncident}
              caseData={caseData}
              disabled={!userCanCrud}
              isLoading={isLoading && updateKey === 'status'}
              onRefresh={handleRefresh}
              toggleStatusCase={toggleStatusCase}
              {...caseStatusData}
            />
          </HeaderPage>
        </HeaderWrapper>
        <WhitePageWrapper>
          <MyWrapper>
            {!initLoadingData && pushCallouts != null && pushCallouts}
            <EuiFlexGroup>
              <EuiFlexItem grow={6}>
                {initLoadingData && <EuiLoadingContent lines={8} />}
                {!initLoadingData && (
                  <>
                    <UserActionTree
                      caseUserActions={caseUserActions}
                      connectors={connectors}
                      data={caseData}
                      fetchUserActions={fetchCaseUserActions.bind(null, caseData.id)}
                      caseServices={caseServices}
                      isLoadingDescription={isLoading && updateKey === 'description'}
                      isLoadingUserActions={isLoadingUserActions}
                      onUpdateField={onUpdateField}
                      updateCase={updateCase}
                      userCanCrud={userCanCrud}
                    />
                    <MyEuiHorizontalRule margin="s" />
                    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexEnd">
                      <EuiFlexItem grow={false}>
                        <EuiButtonToggle
                          data-test-subj={caseStatusData['data-test-subj']}
                          iconType={caseStatusData.icon}
                          isDisabled={!userCanCrud}
                          isSelected={caseStatusData.isSelected}
                          isLoading={isLoading && updateKey === 'status'}
                          label={caseStatusData.buttonLabel}
                          onChange={toggleStatusCase}
                        />
                      </EuiFlexItem>
                      {hasDataToPush && (
                        <EuiFlexItem data-test-subj="has-data-to-push-button" grow={false}>
                          {pushButton}
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <UserList
                  data-test-subj="case-view-user-list-reporter"
                  email={emailContent}
                  headline={i18n.REPORTER}
                  users={[caseData.createdBy]}
                />
                <UserList
                  data-test-subj="case-view-user-list-participants"
                  email={emailContent}
                  headline={i18n.PARTICIPANTS}
                  loading={isLoadingUserActions}
                  users={participants}
                />
                <TagList
                  data-test-subj="case-view-tag-list"
                  disabled={!userCanCrud}
                  tags={caseData.tags}
                  onSubmit={onSubmitTags}
                  isLoading={isLoading && updateKey === 'tags'}
                />
                <EditConnector
                  isLoading={isLoadingConnectors}
                  onSubmit={onSubmitConnector}
                  connectors={connectors}
                  selectedConnector={caseData.connectorId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </MyWrapper>
        </WhitePageWrapper>
        <SpyRoute state={spyState} pageName={SecurityPageName.case} />
      </>
    );
  }
);

export const CaseView = React.memo(({ caseId, userCanCrud }: Props) => {
  const { data, isLoading, isError, fetchCase, updateCase } = useGetCase(caseId);
  if (isError) {
    return null;
  }
  if (isLoading) {
    return (
      <MyEuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner data-test-subj="case-view-loading" size="xl" />
        </EuiFlexItem>
      </MyEuiFlexGroup>
    );
  }

  return (
    <CaseComponent
      caseId={caseId}
      fetchCase={fetchCase}
      caseData={data}
      updateCase={updateCase}
      userCanCrud={userCanCrud}
    />
  );
});

CaseComponent.displayName = 'CaseComponent';
CaseView.displayName = 'CaseView';
