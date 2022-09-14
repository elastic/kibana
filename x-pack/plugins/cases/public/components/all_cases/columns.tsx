/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadgeGroup,
  EuiBadge,
  EuiButton,
  EuiLink,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import styled from 'styled-components';

import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { Case, DeleteCase, UpdateByKey } from '../../../common/ui/types';
import { CaseStatuses, ActionConnector, CaseSeverity } from '../../../common/api';
import { OWNER_INFO } from '../../../common/constants';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { CaseDetailsLink } from '../links';
import * as i18n from './translations';
import { ALERTS } from '../../common/translations';
import { getActions } from './actions';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useApplicationCapabilities, useKibana } from '../../common/lib/kibana';
import { StatusContextMenu } from '../case_action_bar/status_context_menu';
import { TruncatedText } from '../truncated_text';
import { getConnectorIcon } from '../utils';
import type { CasesOwners } from '../../client/helpers/can_use_cases';
import { severities } from '../severity/config';
import { useUpdateCase } from '../../containers/use_update_case';
import { useCasesContext } from '../cases_context/use_cases_context';
import { UserToolTip } from '../user_profiles/user_tooltip';
import { useAssignees } from '../../containers/user_profiles/use_assignees';
import { getUsernameDataTestSubj } from '../user_profiles/data_test_subject';
import { CurrentUserProfile } from '../types';
import { SmallUserAvatar } from '../user_profiles/small_user_avatar';
import { useCasesFeatures } from '../../common/use_cases_features';

export type CasesColumns =
  | EuiTableActionsColumnType<Case>
  | EuiTableComputedColumnType<Case>
  | EuiTableFieldDataColumnType<Case>;

const MediumShadeText = styled.p`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

const renderStringField = (field: string, dataTestSubj: string) =>
  field != null ? <span data-test-subj={dataTestSubj}>{field}</span> : getEmptyTagValue();

const AssigneesColumn: React.FC<{
  assignees: Case['assignees'];
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
}> = ({ assignees, userProfiles, currentUserProfile }) => {
  const { allAssignees } = useAssignees({
    caseAssignees: assignees,
    userProfiles,
    currentUserProfile,
  });

  if (allAssignees.length <= 0) {
    return getEmptyTagValue();
  }

  return (
    <EuiFlexGroup gutterSize="none" data-test-subj="case-table-column-assignee" wrap>
      {allAssignees.map((assignee) => {
        const dataTestSubjName = getUsernameDataTestSubj(assignee);
        return (
          <EuiFlexItem
            grow={false}
            key={assignee.uid}
            data-test-subj={`case-table-column-assignee-${dataTestSubjName}`}
          >
            <UserToolTip userInfo={assignee.profile}>
              <SmallUserAvatar userInfo={assignee.profile} />
            </UserToolTip>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

AssigneesColumn.displayName = 'AssigneesColumn';

export interface GetCasesColumn {
  filterStatus: string;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  handleIsLoading: (a: boolean) => void;
  refreshCases?: (a?: boolean) => void;
  isSelectorView: boolean;
  connectors?: ActionConnector[];
  onRowClick?: (theCase: Case) => void;

  showSolutionColumn?: boolean;
}
export const useCasesColumns = ({
  filterStatus,
  userProfiles,
  currentUserProfile,
  handleIsLoading,
  refreshCases,
  isSelectorView,
  connectors = [],
  onRowClick,
  showSolutionColumn,
}: GetCasesColumn): CasesColumns[] => {
  // Delete case
  const {
    dispatchResetIsDeleted,
    handleOnDeleteConfirm,
    handleToggleModal,
    isDeleted,
    isDisplayConfirmDeleteModal,
    isLoading: isDeleting,
  } = useDeleteCases();

  const { isAlertsEnabled, caseAssignmentAuthorized } = useCasesFeatures();
  const { permissions } = useCasesContext();

  const [deleteThisCase, setDeleteThisCase] = useState<DeleteCase>({
    id: '',
    title: '',
  });

  const { updateCaseProperty, isLoading: isLoadingUpdateCase } = useUpdateCase();

  const toggleDeleteModal = useCallback(
    (deleteCase: Case) => {
      handleToggleModal();
      setDeleteThisCase({ id: deleteCase.id, title: deleteCase.title });
    },
    [handleToggleModal]
  );

  const handleDispatchUpdate = useCallback(
    ({ updateKey, updateValue, caseData }: UpdateByKey) => {
      updateCaseProperty({
        updateKey,
        updateValue,
        caseData,
        onSuccess: () => {
          if (refreshCases != null) refreshCases();
        },
      });
    },
    [refreshCases, updateCaseProperty]
  );

  const actions = useMemo(
    () =>
      getActions({
        deleteCaseOnClick: toggleDeleteModal,
      }),
    [toggleDeleteModal]
  );

  const assignCaseAction = useCallback(
    async (theCase: Case) => {
      if (onRowClick) {
        onRowClick(theCase);
      }
    },
    [onRowClick]
  );

  useEffect(() => {
    handleIsLoading(isDeleting || isLoadingUpdateCase);
  }, [handleIsLoading, isDeleting, isLoadingUpdateCase]);

  useEffect(() => {
    if (isDeleted) {
      if (refreshCases != null) refreshCases();
      dispatchResetIsDeleted();
    }
  }, [isDeleted, dispatchResetIsDeleted, refreshCases]);

  return [
    {
      name: i18n.NAME,
      render: (theCase: Case) => {
        if (theCase.id != null && theCase.title != null) {
          const caseDetailsLinkComponent = isSelectorView ? (
            <TruncatedText text={theCase.title} />
          ) : (
            <CaseDetailsLink detailName={theCase.id} title={theCase.title}>
              <TruncatedText text={theCase.title} />
            </CaseDetailsLink>
          );
          return theCase.status !== CaseStatuses.closed ? (
            caseDetailsLinkComponent
          ) : (
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>{caseDetailsLinkComponent}</EuiFlexItem>
              <EuiFlexItem>
                <MediumShadeText>{i18n.CLOSED}</MediumShadeText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
        return getEmptyTagValue();
      },
    },
    ...(caseAssignmentAuthorized
      ? [
          {
            field: 'assignees',
            name: i18n.ASSIGNEES,
            render: (assignees: Case['assignees']) => (
              <AssigneesColumn
                assignees={assignees}
                userProfiles={userProfiles}
                currentUserProfile={currentUserProfile}
              />
            ),
          },
        ]
      : []),
    {
      field: 'tags',
      name: i18n.TAGS,
      render: (tags: Case['tags']) => {
        if (tags != null && tags.length > 0) {
          const badges = (
            <EuiBadgeGroup data-test-subj="case-table-column-tags">
              {tags.map((tag: string, i: number) => (
                <EuiBadge
                  color="hollow"
                  key={`${tag}-${i}`}
                  data-test-subj={`case-table-column-tags-${tag}`}
                >
                  {tag}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          );

          return (
            <EuiToolTip
              data-test-subj="case-table-column-tags-tooltip"
              position="left"
              content={badges}
            >
              {badges}
            </EuiToolTip>
          );
        }
        return getEmptyTagValue();
      },
      truncateText: true,
    },
    ...(isAlertsEnabled
      ? [
          {
            align: RIGHT_ALIGNMENT,
            field: 'totalAlerts',
            name: ALERTS,
            render: (totalAlerts: Case['totalAlerts']) =>
              totalAlerts != null
                ? renderStringField(`${totalAlerts}`, `case-table-column-alertsCount`)
                : getEmptyTagValue(),
          },
        ]
      : []),
    ...(showSolutionColumn
      ? [
          {
            align: RIGHT_ALIGNMENT,
            field: 'owner',
            name: i18n.SOLUTION,
            render: (caseOwner: CasesOwners) => {
              const ownerInfo = OWNER_INFO[caseOwner];
              return ownerInfo ? (
                <EuiIcon
                  size="m"
                  type={ownerInfo.iconType}
                  title={ownerInfo.label}
                  data-test-subj={`case-table-column-owner-icon-${caseOwner}`}
                />
              ) : (
                getEmptyTagValue()
              );
            },
          },
        ]
      : []),
    {
      align: RIGHT_ALIGNMENT,
      field: 'totalComment',
      name: i18n.COMMENTS,
      render: (totalComment: Case['totalComment']) =>
        totalComment != null
          ? renderStringField(`${totalComment}`, `case-table-column-commentCount`)
          : getEmptyTagValue(),
    },
    filterStatus === CaseStatuses.closed
      ? {
          field: 'closedAt',
          name: i18n.CLOSED_ON,
          sortable: true,
          render: (closedAt: Case['closedAt']) => {
            if (closedAt != null) {
              return (
                <span data-test-subj={`case-table-column-closedAt`}>
                  <FormattedRelativePreferenceDate value={closedAt} />
                </span>
              );
            }
            return getEmptyTagValue();
          },
        }
      : {
          field: 'createdAt',
          name: i18n.CREATED_ON,
          sortable: true,
          render: (createdAt: Case['createdAt']) => {
            if (createdAt != null) {
              return (
                <span data-test-subj={`case-table-column-createdAt`}>
                  <FormattedRelativePreferenceDate value={createdAt} stripMs={true} />
                </span>
              );
            }
            return getEmptyTagValue();
          },
        },
    {
      name: i18n.EXTERNAL_INCIDENT,
      render: (theCase: Case) => {
        if (theCase.id != null) {
          return <ExternalServiceColumn theCase={theCase} connectors={connectors} />;
        }
        return getEmptyTagValue();
      },
    },
    ...(!isSelectorView
      ? [
          {
            name: i18n.STATUS,
            render: (theCase: Case) => {
              if (theCase.status === null || theCase.status === undefined) {
                return getEmptyTagValue();
              }

              return (
                <StatusContextMenu
                  currentStatus={theCase.status}
                  disabled={!permissions.update || isLoadingUpdateCase}
                  onStatusChanged={(status) =>
                    handleDispatchUpdate({
                      updateKey: 'status',
                      updateValue: status,
                      caseData: theCase,
                    })
                  }
                />
              );
            },
          },
        ]
      : []),
    {
      name: i18n.SEVERITY,
      render: (theCase: Case) => {
        if (theCase.severity != null) {
          const severityData = severities[theCase.severity ?? CaseSeverity.LOW];
          return (
            <EuiHealth data-test-subj="case-table-column-severity" color={severityData.color}>
              {severityData.label}
            </EuiHealth>
          );
        }
        return getEmptyTagValue();
      },
    },

    ...(isSelectorView
      ? [
          {
            align: RIGHT_ALIGNMENT,
            render: (theCase: Case) => {
              if (theCase.id != null) {
                return (
                  <EuiButton
                    data-test-subj={`cases-table-row-select-${theCase.id}`}
                    onClick={() => {
                      assignCaseAction(theCase);
                    }}
                    size="s"
                    fill={true}
                  >
                    {i18n.SELECT}
                  </EuiButton>
                );
              }
              return getEmptyTagValue();
            },
          },
        ]
      : []),
    ...(permissions.delete && !isSelectorView
      ? [
          {
            name: (
              <>
                {i18n.ACTIONS}
                <ConfirmDeleteCaseModal
                  caseTitle={deleteThisCase.title}
                  isModalVisible={isDisplayConfirmDeleteModal}
                  onCancel={handleToggleModal}
                  onConfirm={handleOnDeleteConfirm.bind(null, [deleteThisCase])}
                />
              </>
            ),
            actions,
          },
        ]
      : []),
  ];
};

interface Props {
  theCase: Case;
  connectors: ActionConnector[];
}

const IconWrapper = styled.span`
  svg {
    height: 20px !important;
    position: relative;
    top: 3px;
    width: 20px !important;
  }
`;

export const ExternalServiceColumn: React.FC<Props> = ({ theCase, connectors }) => {
  const { triggersActionsUi } = useKibana().services;
  const { actions } = useApplicationCapabilities();

  if (theCase.externalService == null) {
    return renderStringField(i18n.NOT_PUSHED, `case-table-column-external-notPushed`);
  }

  const lastPushedConnector: ActionConnector | undefined = connectors.find(
    (connector) => connector.id === theCase.externalService?.connectorId
  );
  const lastCaseUpdate = theCase.updatedAt != null ? new Date(theCase.updatedAt) : null;
  const lastCasePush =
    theCase.externalService?.pushedAt != null ? new Date(theCase.externalService?.pushedAt) : null;
  const hasDataToPush =
    lastCasePush === null ||
    (lastCaseUpdate != null && lastCasePush.getTime() < lastCaseUpdate?.getTime());

  return (
    <p>
      {actions.read && (
        <IconWrapper>
          <EuiIcon
            size="original"
            title={theCase.externalService?.connectorName}
            type={getConnectorIcon(triggersActionsUi, lastPushedConnector?.actionTypeId)}
            data-test-subj="cases-table-connector-icon"
          />
        </IconWrapper>
      )}
      <EuiLink
        data-test-subj={`case-table-column-external`}
        title={theCase.externalService?.connectorName}
        href={theCase.externalService?.externalUrl}
        target="_blank"
        aria-label={i18n.PUSH_LINK_ARIA(theCase.externalService?.connectorName)}
      >
        {theCase.externalService?.externalTitle}
      </EuiLink>
      {hasDataToPush
        ? renderStringField(i18n.REQUIRES_UPDATE, `case-table-column-external-requiresUpdate`)
        : renderStringField(i18n.UP_TO_DATE, `case-table-column-external-upToDate`)}
    </p>
  );
};
ExternalServiceColumn.displayName = 'ExternalServiceColumn';
