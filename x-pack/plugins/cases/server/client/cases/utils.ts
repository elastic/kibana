/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy, isEmpty } from 'lodash';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { IBasePath } from '@kbn/core-http-browser';
import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import { isPushedUserAction } from '../../../common/utils/user_actions';
import type {
  ActionConnector,
  CaseFullExternalService,
  CaseResponse,
  CaseUserActionsResponse,
  CommentResponse,
  User,
  CaseAttributes,
  CaseAssignees,
  ConnectorMappingsAttributes,
  CaseField,
  ThirdPartyField,
} from '../../../common/api';
import { CommentType, ActionTypes, CaseStatuses } from '../../../common/api';
import type { CasesClientGetAlertsResponse } from '../alerts/types';
import type { ExternalServiceComment, ExternalServiceIncident } from './types';
import { getAlertIds } from '../utils';
import type { CasesConnectorsMap } from '../../connectors';
import { getCaseViewPath } from '../../common/utils';
import * as i18n from './translations';

interface CreateIncidentArgs {
  theCase: CaseResponse;
  userActions: CaseUserActionsResponse;
  connector: ActionConnector;
  alerts: CasesClientGetAlertsResponse;
  casesConnectors: CasesConnectorsMap;
  spaceId: string;
  userProfiles?: Map<string, UserProfile>;
  publicBaseUrl?: IBasePath['publicBaseUrl'];
}

export const dedupAssignees = (assignees?: CaseAssignees): CaseAssignees | undefined => {
  if (assignees == null) {
    return;
  }

  return uniqBy(assignees, 'uid');
};

type LatestPushInfo = { index: number; pushedInfo: CaseFullExternalService } | null;

export const getLatestPushInfo = (
  connectorId: string,
  userActions: CaseUserActionsResponse
): LatestPushInfo => {
  for (const [index, action] of [...userActions].reverse().entries()) {
    if (isPushedUserAction(action) && connectorId === action.payload.externalService.connector_id) {
      try {
        const pushedInfo = action.payload.externalService;
        // We returned the index of the element in the userActions array.
        // As we traverse the userActions in reverse we need to calculate the index of a normal traversal
        return {
          index: userActions.length - index - 1,
          pushedInfo,
        };
      } catch (e) {
        // ignore parse failures and check the next user action
      }
    }
  }

  return null;
};

const getCommentContent = (comment: CommentResponse): string => {
  if (comment.type === CommentType.user) {
    return comment.comment;
  } else if (comment.type === CommentType.alert) {
    const ids = getAlertIds(comment);
    return `Alert with ids ${ids.join(', ')} added to case`;
  } else if (
    comment.type === CommentType.actions &&
    (comment.actions.type === 'isolate' || comment.actions.type === 'unisolate')
  ) {
    const firstHostname =
      comment.actions.targets?.length > 0 ? comment.actions.targets[0].hostname : 'unknown';
    const totalHosts = comment.actions.targets.length;
    const actionText = comment.actions.type === 'isolate' ? 'Isolated' : 'Released';
    const additionalHostsText = totalHosts - 1 > 0 ? `and ${totalHosts - 1} more ` : ``;

    return `${actionText} host ${firstHostname} ${additionalHostsText}with comment: ${comment.comment}`;
  }

  return '';
};

interface CountAlertsInfo {
  totalComments: number;
  pushed: number;
  totalAlerts: number;
}

const getAlertsInfo = (
  comments: CaseResponse['comments']
): { totalAlerts: number; hasUnpushedAlertComments: boolean } => {
  const countingInfo = { totalComments: 0, pushed: 0, totalAlerts: 0 };

  const res =
    comments?.reduce<CountAlertsInfo>(({ totalComments, pushed, totalAlerts }, comment) => {
      if (comment.type === CommentType.alert) {
        return {
          totalComments: totalComments + 1,
          pushed: comment.pushed_at != null ? pushed + 1 : pushed,
          totalAlerts: totalAlerts + (Array.isArray(comment.alertId) ? comment.alertId.length : 1),
        };
      }
      return { totalComments, pushed, totalAlerts };
    }, countingInfo) ?? countingInfo;

  return {
    totalAlerts: res.totalAlerts,
    hasUnpushedAlertComments: res.totalComments > res.pushed,
  };
};

const addAlertMessage = (params: {
  theCase: CaseResponse;
  externalServiceComments: ExternalServiceComment[];
  spaceId: string;
  publicBaseUrl?: IBasePath['publicBaseUrl'];
}): ExternalServiceComment[] => {
  const { theCase, externalServiceComments, spaceId, publicBaseUrl } = params;
  const { totalAlerts, hasUnpushedAlertComments } = getAlertsInfo(theCase.comments);

  const newComments = [...externalServiceComments];

  if (hasUnpushedAlertComments) {
    let comment = `Elastic Alerts attached to the case: ${totalAlerts}`;

    if (publicBaseUrl) {
      const alertsTableUrl = getCaseViewPath({
        publicBaseUrl,
        spaceId,
        caseId: theCase.id,
        owner: theCase.owner,
        tabId: CASE_VIEW_PAGE_TABS.ALERTS,
      });

      comment = `${comment}\n\n${i18n.VIEW_ALERTS_IN_KIBANA}\n${i18n.ALERTS_URL(alertsTableUrl)}`;
    }

    newComments.push({
      comment,
      commentId: `${theCase.id}-total-alerts`,
    });
  }

  return newComments;
};

export const createIncident = async ({
  theCase,
  userActions,
  connector,
  alerts,
  casesConnectors,
  userProfiles,
  spaceId,
  publicBaseUrl,
}: CreateIncidentArgs): Promise<ExternalServiceIncident> => {
  const latestPushInfo = getLatestPushInfo(connector.id, userActions);
  const externalId = latestPushInfo?.pushedInfo?.external_id ?? null;

  const externalServiceFields =
    casesConnectors.get(connector.actionTypeId)?.format(theCase, alerts) ?? {};

  const connectorMappings = casesConnectors.get(connector.actionTypeId)?.getMapping() ?? [];
  const descriptionWithKibanaInformation = addKibanaInformationToDescription(
    theCase,
    spaceId,
    userProfiles,
    publicBaseUrl
  );

  const comments = formatComments({
    userActions,
    latestPushInfo,
    theCase,
    userProfiles,
    spaceId,
    publicBaseUrl,
  });

  const mappedIncident = mapCaseFieldsToExternalSystemFields(
    { title: theCase.title, description: descriptionWithKibanaInformation },
    connectorMappings
  );

  const incident = {
    ...mappedIncident,
    ...externalServiceFields,
    externalId,
  };
  return { incident, comments };
};

export const mapCaseFieldsToExternalSystemFields = (
  caseFields: Record<Exclude<CaseField, 'comments' | 'tags'>, unknown>,
  mapping: ConnectorMappingsAttributes[]
): Record<ThirdPartyField, unknown> => {
  const mappedCaseFields: Record<ThirdPartyField, unknown> = {};

  for (const caseFieldKey of Object.keys(caseFields) as Array<
    Exclude<CaseField, 'comments' | 'tags'>
  >) {
    const mapDefinition = mapping.find(
      (mappingEntry) => mappingEntry.source === caseFieldKey && mappingEntry.target !== 'not_mapped'
    );

    if (mapDefinition) {
      mappedCaseFields[mapDefinition.target] = caseFields[caseFieldKey];
    }
  }

  return mappedCaseFields;
};

export const formatComments = ({
  userActions,
  latestPushInfo,
  theCase,
  spaceId,
  userProfiles,
  publicBaseUrl,
}: {
  theCase: CaseResponse;
  latestPushInfo: LatestPushInfo;
  userActions: CaseUserActionsResponse;
  spaceId: string;
  userProfiles?: Map<string, UserProfile>;
  publicBaseUrl?: IBasePath['publicBaseUrl'];
}): ExternalServiceComment[] => {
  const commentsIdsToBeUpdated = new Set(
    userActions
      .slice(latestPushInfo?.index ?? 0)
      .filter((action) => action.type === ActionTypes.comment)
      .map((action) => action.comment_id)
  );

  const commentsToBeUpdated = theCase.comments?.filter(
    (comment) =>
      // We push only user's comments
      (comment.type === CommentType.user || comment.type === CommentType.actions) &&
      commentsIdsToBeUpdated.has(comment.id)
  );

  let comments: ExternalServiceComment[] = [];

  if (commentsToBeUpdated && Array.isArray(commentsToBeUpdated) && commentsToBeUpdated.length > 0) {
    comments = addKibanaInformationToComments(commentsToBeUpdated, userProfiles);
  }

  comments = addAlertMessage({
    theCase,
    externalServiceComments: comments,
    spaceId,
    publicBaseUrl,
  });
  return comments;
};

export const addKibanaInformationToDescription = (
  theCase: CaseResponse,
  spaceId: string,
  userProfiles?: Map<string, UserProfile>,
  publicBaseUrl?: IBasePath['publicBaseUrl']
) => {
  const addedBy = i18n.ADDED_BY(
    getEntity(
      {
        createdBy: theCase.created_by,
        updatedBy: theCase.updated_by,
      },
      userProfiles
    )
  );

  const descriptionWithKibanaInformation = `${theCase.description}\n\n${addedBy}.`;

  if (!publicBaseUrl) {
    return descriptionWithKibanaInformation;
  }

  const caseUrl = getCaseViewPath({
    publicBaseUrl,
    spaceId,
    caseId: theCase.id,
    owner: theCase.owner,
  });

  return `${descriptionWithKibanaInformation}\n${i18n.VIEW_IN_KIBANA}.\n${i18n.CASE_URL(caseUrl)}`;
};

const addKibanaInformationToComments = (
  comments: CaseResponse['comments'] = [],
  userProfiles?: Map<string, UserProfile>
): ExternalServiceComment[] =>
  comments.map((theComment) => {
    const addedBy = i18n.ADDED_BY(
      getEntity(
        {
          createdBy: theComment.created_by,
          updatedBy: theComment.updated_by,
        },
        userProfiles
      )
    );

    return {
      comment: `${getCommentContent(theComment)}\n\n${addedBy}.`,
      commentId: theComment.id,
    };
  });

export const getEntity = (
  entity: { createdBy: CaseResponse['created_by']; updatedBy: CaseResponse['updated_by'] },
  userProfiles?: Map<string, UserProfile>
): string => {
  return (
    getDisplayName(entity.updatedBy, userProfiles) ??
    getDisplayName(entity.createdBy, userProfiles) ??
    i18n.UNKNOWN
  );
};

const getDisplayName = (
  user: User | null | undefined,
  userProfiles?: Map<string, UserProfile>
): string | undefined => {
  if (user == null) {
    return;
  }

  if (user.profile_uid != null) {
    const updatedByProfile = userProfiles?.get(user.profile_uid);

    if (updatedByProfile != null) {
      return (
        validOrUndefined(updatedByProfile.user.full_name) ??
        validOrUndefined(updatedByProfile.user.username)
      );
    }
  }

  return validOrUndefined(user.full_name) ?? validOrUndefined(user.username) ?? i18n.UNKNOWN;
};

const validOrUndefined = (value: string | undefined | null): string | undefined => {
  if (value == null || isEmpty(value)) {
    return;
  }

  return value;
};

export const getClosedInfoForUpdate = ({
  user,
  status,
  closedDate,
}: {
  closedDate: string;
  user: User;
  status?: CaseStatuses;
}): Pick<CaseAttributes, 'closed_at' | 'closed_by'> | undefined => {
  if (status && status === CaseStatuses.closed) {
    return {
      closed_at: closedDate,
      closed_by: user,
    };
  }

  if (status && (status === CaseStatuses.open || status === CaseStatuses['in-progress'])) {
    return {
      closed_at: null,
      closed_by: null,
    };
  }
};

export const getDurationInSeconds = ({
  closedAt,
  createdAt,
}: {
  closedAt: string;
  createdAt: CaseAttributes['created_at'];
}) => {
  try {
    if (createdAt != null && closedAt != null) {
      const createdAtMillis = new Date(createdAt).getTime();
      const closedAtMillis = new Date(closedAt).getTime();

      if (!isNaN(createdAtMillis) && !isNaN(closedAtMillis) && closedAtMillis >= createdAtMillis) {
        return { duration: Math.floor((closedAtMillis - createdAtMillis) / 1000) };
      }
    }
  } catch (err) {
    // Silence date errors
  }
};

export const getDurationForUpdate = ({
  status,
  closedAt,
  createdAt,
}: {
  closedAt: string;
  createdAt: CaseAttributes['created_at'];
  status?: CaseStatuses;
}): Pick<CaseAttributes, 'duration'> | undefined => {
  if (status && status === CaseStatuses.closed) {
    return getDurationInSeconds({ createdAt, closedAt });
  }

  if (status && (status === CaseStatuses.open || status === CaseStatuses['in-progress'])) {
    return {
      duration: null,
    };
  }
};
