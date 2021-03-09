/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiCommentProps } from '@elastic/eui';
import { isObject, get, isString, isNumber, isEmpty } from 'lodash';
import React, { useMemo } from 'react';

import { SearchResponse } from 'elasticsearch';
import {
  CaseFullExternalService,
  ActionConnector,
  CaseStatuses,
  CommentType,
} from '../../../../../case/common/api';
import { CaseUserActions } from '../../containers/types';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { parseString } from '../../containers/utils';
import { Tags } from '../tag_list/tags';
import { UserActionUsernameWithAvatar } from './user_action_username_with_avatar';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionCopyLink } from './user_action_copy_link';
import { UserActionMoveToReference } from './user_action_move_to_reference';
import { Status, statuses } from '../status';
import { UserActionShowAlert } from './user_action_show_alert';
import * as i18n from './translations';
import { AlertCommentEvent } from './user_action_alert_comment_event';
import { InvestigateInTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { Ecs } from '../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../common/search_strategy';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { buildAlertsQuery } from '../case_view/helpers';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { KibanaServices } from '../../../common/lib/kibana';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../common/constants';

interface LabelTitle {
  action: CaseUserActions;
  field: string;
}

const getStatusTitle = (id: string, status: CaseStatuses) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems={'center'}
      data-test-subj={`${id}-user-action-status-title`}
    >
      <EuiFlexItem grow={false}>{i18n.MARKED_CASE_AS}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Status type={status} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const isStatusValid = (status: string): status is CaseStatuses =>
  Object.prototype.hasOwnProperty.call(statuses, status);

export const getLabelTitle = ({ action, field }: LabelTitle) => {
  if (field === 'tags') {
    return getTagsLabelTitle(action);
  } else if (field === 'title' && action.action === 'update') {
    return `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${
      action.newValue
    }"`;
  } else if (field === 'description' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`;
  } else if (field === 'status' && action.action === 'update') {
    const status = action.newValue ?? '';
    if (isStatusValid(status)) {
      return getStatusTitle(action.actionId, status);
    }

    return '';
  } else if (field === 'comment' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
  }

  return '';
};

export const getConnectorLabelTitle = ({
  action,
  connectors,
}: {
  action: CaseUserActions;
  connectors: ActionConnector[];
}) => {
  const oldValue = parseString(`${action.oldValue}`);
  const newValue = parseString(`${action.newValue}`);

  if (oldValue === null || newValue === null) {
    return '';
  }

  // Connector changed
  if (oldValue.id !== newValue.id) {
    const newConnector = connectors.find((c) => c.id === newValue.id);
    return newValue.id != null && newValue.id !== 'none' && newConnector != null
      ? i18n.SELECTED_THIRD_PARTY(newConnector.name)
      : i18n.REMOVED_THIRD_PARTY;
  } else {
    // Field changed
    return i18n.CHANGED_CONNECTOR_FIELD;
  }
};

const getTagsLabelTitle = (action: CaseUserActions) => {
  const tags = action.newValue != null ? action.newValue.split(',') : [];

  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span">
      <EuiFlexItem data-test-subj="ua-tags-label" grow={false}>
        {action.action === 'add' && i18n.ADDED_FIELD}
        {action.action === 'delete' && i18n.REMOVED_FIELD} {i18n.TAGS.toLowerCase()}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Tags tags={tags} gutterSize="xs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getPushedServiceLabelTitle = (action: CaseUserActions, firstPush: boolean) => {
  const pushedVal = JSON.parse(action.newValue ?? '') as CaseFullExternalService;
  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" data-test-subj="pushed-service-label-title">
      <EuiFlexItem data-test-subj="pushed-label">
        {`${firstPush ? i18n.PUSHED_NEW_INCIDENT : i18n.UPDATE_INCIDENT} ${
          pushedVal?.connector_name
        }`}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="pushed-value" href={pushedVal?.external_url} target="_blank">
          {pushedVal?.external_title}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const getPushInfo = (
  caseServices: CaseServices,
  parsedValue: { connector_id: string; connector_name: string },
  index: number
) =>
  parsedValue != null
    ? {
        firstPush: caseServices[parsedValue.connector_id]?.firstPushIndex === index,
        parsedConnectorId: parsedValue.connector_id,
        parsedConnectorName: parsedValue.connector_name,
      }
    : {
        firstPush: false,
        parsedConnectorId: 'none',
        parsedConnectorName: 'none',
      };

const getUpdateActionIcon = (actionField: string): string => {
  if (actionField === 'tags') {
    return 'tag';
  } else if (actionField === 'status') {
    return 'folderClosed';
  }

  return 'dot';
};

export const getUpdateAction = ({
  action,
  label,
  handleOutlineComment,
}: {
  action: CaseUserActions;
  label: string | JSX.Element;
  handleOutlineComment: (id: string) => void;
}): EuiCommentProps => ({
  username: (
    <UserActionUsernameWithAvatar
      username={action.actionBy.username}
      fullName={action.actionBy.fullName}
    />
  ),
  type: 'update',
  event: label,
  'data-test-subj': `${action.actionField[0]}-${action.action}-action-${action.actionId}`,
  timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
  timelineIcon: getUpdateActionIcon(action.actionField[0]),
  actions: (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UserActionCopyLink id={action.actionId} />
      </EuiFlexItem>
      {action.action === 'update' && action.commentId != null && (
        <EuiFlexItem>
          <UserActionMoveToReference id={action.commentId} outlineComment={handleOutlineComment} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ),
});

export const getAlertAttachment = ({
  action,
  alertId,
  index,
  loadingAlertData,
  ruleId,
  ruleName,
  onShowAlertDetails,
}: {
  action: CaseUserActions;
  onShowAlertDetails: (alertId: string, index: string) => void;
  alertId: string;
  index: string;
  loadingAlertData: boolean;
  ruleId: string;
  ruleName: string;
}): EuiCommentProps => {
  return {
    username: (
      <UserActionUsernameWithAvatar
        username={action.actionBy.username}
        fullName={action.actionBy.fullName}
      />
    ),
    className: 'comment-alert',
    type: 'update',
    event: (
      <AlertCommentEvent
        alertId={alertId}
        loadingAlertData={loadingAlertData}
        ruleId={ruleId}
        ruleName={ruleName}
        commentType={CommentType.alert}
      />
    ),
    'data-test-subj': `${action.actionField[0]}-${action.action}-action-${action.actionId}`,
    timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
    timelineIcon: 'bell',
    actions: (
      <EuiFlexGroup>
        <EuiFlexItem>
          <UserActionCopyLink id={action.actionId} />
        </EuiFlexItem>
        <EuiFlexItem>
          <UserActionShowAlert
            id={action.actionId}
            alertId={alertId}
            index={index}
            onShowAlertDetails={onShowAlertDetails}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };
};

export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.reduce<string[]>((acc, v) => {
      if (v != null) {
        switch (typeof v) {
          case 'number':
          case 'boolean':
            return [...acc, v.toString()];
          case 'object':
            try {
              return [...acc, JSON.stringify(v)];
            } catch {
              return [...acc, 'Invalid Object'];
            }
          case 'string':
            return [...acc, v];
          default:
            return [...acc, `${v}`];
        }
      }
      return acc;
    }, []);
  } else if (value == null) {
    return [];
  } else if (!Array.isArray(value) && typeof value === 'object') {
    try {
      return [JSON.stringify(value)];
    } catch {
      return ['Invalid Object'];
    }
  } else {
    return [`${value}`];
  }
};

export const formatAlertToEcsSignal = (alert: {}): Ecs =>
  Object.keys(alert).reduce<Ecs>((accumulator, key) => {
    const item = get(alert, key);
    if (item != null && isObject(item)) {
      return { ...accumulator, [key]: formatAlertToEcsSignal(item) };
    } else if (Array.isArray(item) || isString(item) || isNumber(item)) {
      return { ...accumulator, [key]: toStringArray(item) };
    }
    return accumulator;
  }, {} as Ecs);

const EMPTY_ARRAY: TimelineNonEcsData[] = [];
export const getGeneratedAlertsAttachment = ({
  action,
  alertIds,
  ruleId,
  ruleName,
}: {
  action: CaseUserActions;
  alertIds: string[];
  ruleId: string;
  ruleName: string;
}): EuiCommentProps => {
  const fetchEcsAlertsData = async (fetchAlertIds?: string[]): Promise<Ecs[]> => {
    if (isEmpty(fetchAlertIds)) {
      return [];
    }
    const alertResponse = await KibanaServices.get().http.fetch<
      SearchResponse<{ '@timestamp': string; [key: string]: unknown }>
    >(DETECTION_ENGINE_QUERY_SIGNALS_URL, {
      method: 'POST',
      body: JSON.stringify(buildAlertsQuery(fetchAlertIds ?? [])),
    });
    return (
      alertResponse?.hits.hits.reduce<Ecs[]>(
        (acc, { _id, _index, _source }) => [
          ...acc,
          {
            ...formatAlertToEcsSignal(_source as {}),
            _id,
            _index,
            timestamp: _source['@timestamp'],
          },
        ],
        []
      ) ?? []
    );
  };
  return {
    username: <EuiIcon type="logoSecurity" size="m" />,
    className: 'comment-alert',
    type: 'update',
    event: (
      <AlertCommentEvent
        alertId={alertIds[0]}
        ruleId={ruleId}
        ruleName={ruleName}
        alertsCount={alertIds.length}
        commentType={CommentType.generatedAlert}
      />
    ),
    'data-test-subj': `${action.actionField[0]}-${action.action}-action-${action.actionId}`,
    timestamp: <UserActionTimestamp createdAt={action.actionAt} />,
    timelineIcon: 'bell',
    actions: (
      <EuiFlexGroup>
        <EuiFlexItem>
          <UserActionCopyLink id={action.actionId} />
        </EuiFlexItem>
        <EuiFlexItem>
          <InvestigateInTimelineAction
            ariaLabel={i18n.SEND_ALERT_TO_TIMELINE}
            alertIds={alertIds}
            key="investigate-in-timeline"
            ecsRowData={null}
            fetchEcsAlertsData={fetchEcsAlertsData}
            nonEcsRowData={EMPTY_ARRAY}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };
};

interface Signal {
  rule: {
    id: string;
    name: string;
    to: string;
    from: string;
  };
}

interface SignalHit {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
    signal: Signal;
  };
}

export interface Alert {
  _id: string;
  _index: string;
  '@timestamp': string;
  signal: Signal;
  [key: string]: unknown;
}

export const useFetchAlertData = (alertIds: string[]): [boolean, Record<string, Ecs>] => {
  const { selectedPatterns } = useSourcererScope(SourcererScopeName.detections);
  const alertsQuery = useMemo(() => buildAlertsQuery(alertIds), [alertIds]);

  const { loading: isLoadingAlerts, data: alertsData } = useQueryAlerts<SignalHit, unknown>(
    alertsQuery,
    selectedPatterns[0]
  );

  const alerts = useMemo(
    () =>
      alertsData?.hits.hits.reduce<Record<string, Ecs>>(
        (acc, { _id, _index, _source }) => ({
          ...acc,
          [_id]: {
            ...formatAlertToEcsSignal(_source),
            _id,
            _index,
            timestamp: _source['@timestamp'],
          },
        }),
        {}
      ) ?? {},
    [alertsData?.hits.hits]
  );

  return [isLoadingAlerts, alerts];
};
