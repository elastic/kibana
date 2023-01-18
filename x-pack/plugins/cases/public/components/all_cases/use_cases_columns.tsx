/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type {
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import {
  EuiBadgeGroup,
  EuiBadge,
  EuiButton,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import styled from 'styled-components';
import { Status } from '@kbn/cases-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

import type { Case } from '../../../common/ui/types';
import type { ActionConnector } from '../../../common/api';
import { CaseStatuses, CaseSeverity } from '../../../common/api';
import { OWNER_INFO } from '../../../common/constants';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { CaseDetailsLink } from '../links';
import * as i18n from './translations';
import { ALERTS } from '../../common/translations';
import { useActions } from './use_actions';
import { useApplicationCapabilities, useKibana } from '../../common/lib/kibana';
import { TruncatedText } from '../truncated_text';
import { getConnectorIcon } from '../utils';
import type { CasesOwners } from '../../client/helpers/can_use_cases';
import { severities } from '../severity/config';
import { useCasesFeatures } from '../../common/use_cases_features';
import { AssigneesColumn } from './assignees_column';

type CasesColumns =
  | EuiTableActionsColumnType<Case>
  | EuiTableComputedColumnType<Case>
  | EuiTableFieldDataColumnType<Case>;

const MediumShadeText = styled.p`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

const LINE_CLAMP = 3;
const LineClampedEuiBadgeGroup = euiStyled(EuiBadgeGroup)`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

// margin-right is required here because -webkit-box-orient: vertical;
// in the EuiBadgeGroup prevents us from defining gutterSize.
const StyledEuiBadge = euiStyled(EuiBadge)`
  max-width: 100px;
  margin-right: 5px;
`; // to allow for ellipsis

const renderStringField = (field: string, dataTestSubj: string) =>
  field != null ? <span data-test-subj={dataTestSubj}>{field}</span> : getEmptyTagValue();

export interface GetCasesColumn {
  filterStatus: string;
  userProfiles: Map<string, UserProfileWithAvatar>;
  isSelectorView: boolean;
  connectors?: ActionConnector[];
  onRowClick?: (theCase: Case) => void;
  showSolutionColumn?: boolean;
  disableActions?: boolean;
}

export interface UseCasesColumnsReturnValue {
  columns: CasesColumns[];
}

export const useCasesColumns = ({
  filterStatus,
  userProfiles,
  isSelectorView,
  connectors = [],
  onRowClick,
  showSolutionColumn,
  disableActions = false,
}: GetCasesColumn): UseCasesColumnsReturnValue => {
  const { isAlertsEnabled, caseAssignmentAuthorized } = useCasesFeatures();
  const { actions } = useActions({ disableActions });

  const assignCaseAction = useCallback(
    async (theCase: Case) => {
      if (onRowClick) {
        onRowClick(theCase);
      }
    },
    [onRowClick]
  );

  const columns: CasesColumns[] = [
    {
      field: 'title',
      name: i18n.NAME,
      sortable: true,
      render: (title: string, theCase: Case) => {
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
      width: '20%',
    },
  ];

  if (caseAssignmentAuthorized) {
    columns.push({
      field: 'assignees',
      name: i18n.ASSIGNEES,
      render: (assignees: Case['assignees']) => (
        <AssigneesColumn assignees={assignees} userProfiles={userProfiles} />
      ),
      width: !isSelectorView ? '180px' : undefined,
    });
  }

  columns.push({
    field: 'tags',
    name: i18n.TAGS,
    render: (tags: Case['tags']) => {
      if (tags != null && tags.length > 0) {
        const clampedBadges = (
          <LineClampedEuiBadgeGroup data-test-subj="case-table-column-tags">
            {tags.map((tag: string, i: number) => (
              <StyledEuiBadge
                color="hollow"
                key={`${tag}-${i}`}
                data-test-subj={`case-table-column-tags-${tag}`}
              >
                {tag}
              </StyledEuiBadge>
            ))}
          </LineClampedEuiBadgeGroup>
        );

        const unclampedBadges = (
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
            content={unclampedBadges}
          >
            {clampedBadges}
          </EuiToolTip>
        );
      }
      return getEmptyTagValue();
    },
    width: '15%',
  });

  if (isAlertsEnabled) {
    columns.push({
      align: RIGHT_ALIGNMENT,
      field: 'totalAlerts',
      name: ALERTS,
      render: (totalAlerts: Case['totalAlerts']) =>
        totalAlerts != null
          ? renderStringField(`${totalAlerts}`, `case-table-column-alertsCount`)
          : getEmptyTagValue(),
      width: '80px',
    });
  }

  if (showSolutionColumn) {
    columns.push({
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
    });
  }

  columns.push({
    align: RIGHT_ALIGNMENT,
    field: 'totalComment',
    name: i18n.COMMENTS,
    render: (totalComment: Case['totalComment']) =>
      totalComment != null
        ? renderStringField(`${totalComment}`, `case-table-column-commentCount`)
        : getEmptyTagValue(),
  });

  if (filterStatus === CaseStatuses.closed) {
    columns.push({
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
    });
  } else {
    columns.push({
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
    });
  }

  columns.push({
    field: 'updatedAt',
    name: i18n.UPDATED_ON,
    sortable: true,
    render: (updatedAt: Case['updatedAt']) => {
      if (updatedAt != null) {
        return (
          <span data-test-subj="case-table-column-updatedAt">
            <FormattedRelativePreferenceDate value={updatedAt} stripMs={true} />
          </span>
        );
      }
      return getEmptyTagValue();
    },
  });

  columns.push(
    {
      name: i18n.EXTERNAL_INCIDENT,
      render: (theCase: Case) => {
        if (theCase.id != null) {
          return <ExternalServiceColumn theCase={theCase} connectors={connectors} />;
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'status',
      name: i18n.STATUS,
      sortable: true,
      render: (status: Case['status']) => {
        if (status != null) {
          return <Status status={status} />;
        }

        return getEmptyTagValue();
      },
    },
    {
      field: 'severity',
      name: i18n.SEVERITY,
      sortable: true,
      render: (severity: Case['severity']) => {
        if (severity != null) {
          const severityData = severities[severity ?? CaseSeverity.LOW];
          return (
            <EuiHealth
              data-test-subj={`case-table-column-severity-${severity}`}
              color={severityData.color}
            >
              {severityData.label}
            </EuiHealth>
          );
        }
        return getEmptyTagValue();
      },
    }
  );

  if (isSelectorView) {
    columns.push({
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
    });
  }

  if (!isSelectorView && actions) {
    columns.push(actions);
  }

  return { columns };
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
