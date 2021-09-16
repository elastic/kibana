/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiBadgeGroup,
  EuiBadge,
  EuiLink,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import styled from 'styled-components';

import {
  CaseStatuses,
  CaseType,
  DeleteCase,
  Case,
  SubCase,
  ActionConnector,
} from '../../../common';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { CaseDetailsHrefSchema, CaseDetailsLink, CasesNavigation } from '../links';
import * as i18n from './translations';
import { getSubCasesStatusCountsBadges, isSubCase } from './helpers';
import { ALERTS } from '../../common/translations';
import { getActions } from './actions';
import { UpdateCase } from '../../containers/use_get_cases';
import { useDeleteCases } from '../../containers/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useKibana } from '../../common/lib/kibana';
import { StatusContextMenu } from '../case_action_bar/status_context_menu';
import { TruncatedText } from '../truncated_text';
import { getConnectorIcon } from '../utils';

export type CasesColumns =
  | EuiTableActionsColumnType<Case>
  | EuiTableComputedColumnType<Case>
  | EuiTableFieldDataColumnType<Case>;

const MediumShadeText = styled.p`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

const Spacer = styled.span`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const TagWrapper = styled(EuiBadgeGroup)`
  width: 100%;
`;

const renderStringField = (field: string, dataTestSubj: string) =>
  field != null ? <span data-test-subj={dataTestSubj}>{field}</span> : getEmptyTagValue();

export interface GetCasesColumn {
  caseDetailsNavigation?: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>;
  disableAlerts?: boolean;
  dispatchUpdateCaseProperty: (u: UpdateCase) => void;
  filterStatus: string;
  handleIsLoading: (a: boolean) => void;
  isLoadingCases: string[];
  refreshCases?: (a?: boolean) => void;
  isSelectorView: boolean;
  userCanCrud: boolean;
  connectors?: ActionConnector[];
}
export const useCasesColumns = ({
  caseDetailsNavigation,
  disableAlerts = false,
  dispatchUpdateCaseProperty,
  filterStatus,
  handleIsLoading,
  isLoadingCases,
  refreshCases,
  isSelectorView,
  userCanCrud,
  connectors = [],
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

  const [deleteThisCase, setDeleteThisCase] = useState<DeleteCase>({
    id: '',
    title: '',
    type: null,
  });

  const toggleDeleteModal = useCallback(
    (deleteCase: Case) => {
      handleToggleModal();
      setDeleteThisCase({ id: deleteCase.id, title: deleteCase.title, type: deleteCase.type });
    },
    [handleToggleModal]
  );

  const handleDispatchUpdate = useCallback(
    (args: Omit<UpdateCase, 'refetchCasesStatus'>) => {
      dispatchUpdateCaseProperty({
        ...args,
        refetchCasesStatus: () => {
          if (refreshCases != null) refreshCases();
        },
      });
    },
    [dispatchUpdateCaseProperty, refreshCases]
  );

  const actions = useMemo(
    () =>
      getActions({
        deleteCaseOnClick: toggleDeleteModal,
      }),
    [toggleDeleteModal]
  );

  useEffect(() => {
    handleIsLoading(isDeleting || isLoadingCases.indexOf('caseUpdate') > -1);
  }, [handleIsLoading, isDeleting, isLoadingCases]);

  useEffect(() => {
    if (isDeleted) {
      if (refreshCases != null) refreshCases();
      dispatchResetIsDeleted();
    }
  }, [isDeleted, dispatchResetIsDeleted, refreshCases]);

  return [
    {
      name: i18n.NAME,
      render: (theCase: Case | SubCase) => {
        if (theCase.id != null && theCase.title != null) {
          const caseDetailsLinkComponent =
            caseDetailsNavigation != null ? (
              <CaseDetailsLink
                caseDetailsNavigation={caseDetailsNavigation}
                detailName={isSubCase(theCase) ? theCase.caseParentId : theCase.id}
                subCaseId={isSubCase(theCase) ? theCase.id : undefined}
                title={theCase.title}
              >
                <TruncatedText text={theCase.title} />
              </CaseDetailsLink>
            ) : (
              <TruncatedText text={theCase.title} />
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
    {
      field: 'createdBy',
      name: i18n.REPORTER,
      render: (createdBy: Case['createdBy']) => {
        if (createdBy != null) {
          return (
            <>
              <EuiAvatar
                className="userAction__circle"
                name={createdBy.fullName ? createdBy.fullName : createdBy.username ?? i18n.UNKNOWN}
                size="s"
              />
              <Spacer data-test-subj="case-table-column-createdBy">
                {createdBy.fullName ? createdBy.fullName : createdBy.username ?? i18n.UNKNOWN}
              </Spacer>
            </>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'tags',
      name: i18n.TAGS,
      render: (tags: Case['tags']) => {
        if (tags != null && tags.length > 0) {
          return (
            <TagWrapper>
              {tags.map((tag: string, i: number) => (
                <EuiBadge
                  color="hollow"
                  key={`${tag}-${i}`}
                  data-test-subj={`case-table-column-tags-${i}`}
                >
                  {tag}
                </EuiBadge>
              ))}
            </TagWrapper>
          );
        }
        return getEmptyTagValue();
      },
      truncateText: true,
    },
    ...(!disableAlerts
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
          name: i18n.OPENED_ON,
          sortable: true,
          render: (createdAt: Case['createdAt']) => {
            if (createdAt != null) {
              return (
                <span data-test-subj={`case-table-column-createdAt`}>
                  <FormattedRelativePreferenceDate value={createdAt} />
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
              if (theCase?.subCases == null || theCase.subCases.length === 0) {
                if (theCase.status == null || theCase.type === CaseType.collection) {
                  return getEmptyTagValue();
                }
                return (
                  <StatusContextMenu
                    currentStatus={theCase.status}
                    disabled={!userCanCrud || isLoadingCases.length > 0}
                    onStatusChanged={(status) =>
                      handleDispatchUpdate({
                        updateKey: 'status',
                        updateValue: status,
                        caseId: theCase.id,
                        version: theCase.version,
                      })
                    }
                  />
                );
              }

              const badges = getSubCasesStatusCountsBadges(theCase.subCases);
              return badges.map(({ color, count }, index) => (
                <EuiBadge key={index} color={color}>
                  {count}
                </EuiBadge>
              ));
            },
          },
        ]
      : []),
    ...(userCanCrud && !isSelectorView
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
      <IconWrapper>
        <EuiIcon
          size="original"
          title={theCase.externalService?.connectorName}
          type={getConnectorIcon(triggersActionsUi, lastPushedConnector?.actionTypeId)}
        />
      </IconWrapper>
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
