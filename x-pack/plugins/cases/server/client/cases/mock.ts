/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CommentResponse,
  CaseUserActionsResponse,
  CommentResponseAlertsType,
  ConnectorMappingsAttributes,
} from '../../../common/api';
import {
  CommentType,
  ConnectorTypes,
  Actions,
  ExternalReferenceStorageType,
} from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';

export const updateUser = {
  updated_at: '2020-03-13T08:34:53.450Z',
  updated_by: { full_name: 'Another User', username: 'another', email: 'elastic@elastic.co' },
};

const entity = {
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' },
  updatedAt: null,
  updatedBy: null,
};

export const comment: CommentResponse = {
  id: 'comment-user-1',
  comment: 'Wow, good luck catching that bad meanie!',
  type: CommentType.user as const,
  created_at: '2019-11-25T21:55:00.177Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const isolateCommentActions: CommentResponse = {
  id: 'mock-action-comment-1',
  comment: 'Isolating this for investigation',
  type: CommentType.actions as const,
  created_at: '2019-11-25T21:55:00.177Z',
  actions: {
    targets: [
      {
        endpointId: '123',
        hostname: 'windows-host-1',
      },
    ],
    type: 'isolate',
  },
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const releaseCommentActions: CommentResponse = {
  id: 'mock-action-comment-2',
  comment: 'Releasing this for investigation',
  type: CommentType.actions as const,
  created_at: '2019-11-25T21:55:00.177Z',
  actions: {
    targets: [
      {
        endpointId: '123',
        hostname: 'windows-host-1',
      },
    ],
    type: 'unisolate',
  },
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const isolateCommentActionsMultipleTargets: CommentResponse = {
  id: 'mock-action-comment-3',
  comment: 'Isolating this for investigation',
  type: CommentType.actions as const,
  created_at: '2019-11-25T21:55:00.177Z',
  actions: {
    targets: [
      {
        endpointId: '123',
        hostname: 'windows-host-1',
      },
      {
        endpointId: '456',
        hostname: 'windows-host-2',
      },
    ],
    type: 'isolate',
  },
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const commentAlert: CommentResponse = {
  id: 'comment-alert-1',
  alertId: 'alert-id-1',
  index: 'alert-index-1',
  rule: {
    id: 'rule-id-1',
    name: 'rule-name-1',
  },
  type: CommentType.alert as const,
  created_at: '2019-11-25T21:55:00.177Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const commentAlertMultipleIds: CommentResponseAlertsType = {
  ...commentAlert,
  id: 'comment-alert-2',
  alertId: ['alert-id-1', 'alert-id-2'],
  index: 'alert-index-1',
  type: CommentType.alert as const,
  owner: SECURITY_SOLUTION_OWNER,
};

export const commentExternalReference: CommentResponse = {
  id: 'comment-external-reference-1',
  type: CommentType.externalReference as const,
  externalReferenceId: 'my-id',
  externalReferenceStorage: {
    type: ExternalReferenceStorageType.elasticSearchDoc as const,
  },
  externalReferenceAttachmentTypeId: '.test',
  externalReferenceMetadata: null,
  created_at: '2019-11-25T21:55:00.177Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const commentPersistableState: CommentResponse = {
  id: 'comment-persistable-state-1',
  type: CommentType.persistableState,
  persistableStateAttachmentTypeId: '.test',
  persistableStateAttachmentState: { foo: 'foo', injectedId: 'testRef' },
  created_at: '2019-11-25T21:55:00.177Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const basicParams = {
  description: 'a description',
  title: 'a title',
  ...entity,
};

export const mappings: ConnectorMappingsAttributes[] = [
  {
    source: 'title',
    target: 'short_description',
    action_type: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    action_type: 'append',
  },
  {
    source: 'comments',
    target: 'comments',
    action_type: 'append',
  },
];

export const userActions: CaseUserActionsResponse = [
  {
    action: Actions.create,
    type: 'create_case',
    created_at: '2021-02-03T17:41:03.771Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      title: 'Case SIR',
      tags: ['sir'],
      description: 'testing sir',
      connector: {
        id: '456',
        name: 'ServiceNow SN',
        type: ConnectorTypes.serviceNowSIR,
        fields: {
          category: 'Denial of Service',
          destIp: true,
          malwareHash: true,
          malwareUrl: true,
          priority: '2',
          sourceIp: true,
          subcategory: '45',
        },
      },
      settings: { syncAlerts: true },
      status: 'open',
      severity: 'low',
      owner: SECURITY_SOLUTION_OWNER,
      assignees: [],
    },
    action_id: 'fd830c60-6646-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: null,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'pushed',
    action: Actions.push_to_service,
    created_at: '2021-02-03T17:41:26.108Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      externalService: {
        pushed_at: '2021-02-03T17:41:26.108Z',
        pushed_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
        connector_id: '456',
        connector_name: 'ServiceNow SN',
        external_id: 'external-id',
        external_title: 'SIR0010037',
        external_url:
          'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
      },
    },
    action_id: '0a801750-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: null,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:44:21.067Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: {
        type: commentAlert.type,
        alertId: commentAlert.alertId,
        index: commentAlert.index,
        rule: commentAlert.rule,
        owner: commentAlert.owner,
      },
    },
    action_id: '7373eb60-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: commentAlert.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:44:33.078Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: {
        type: commentAlertMultipleIds.type,
        alertId: commentAlertMultipleIds.alertId,
        index: commentAlertMultipleIds.index,
        rule: commentAlertMultipleIds.rule,
        owner: commentAlertMultipleIds.owner,
      },
    },
    action_id: '7abc6410-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: commentAlertMultipleIds.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:48:30.616Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: {
        type: isolateCommentActions.type,
        owner: isolateCommentActions.owner,
        comment: isolateCommentActions.comment,
        actions: isolateCommentActions.actions,
      },
    },
    action_id: '0818e5e0-6648-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: isolateCommentActions.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:48:30.616Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: {
        type: releaseCommentActions.type,
        owner: releaseCommentActions.owner,
        comment: releaseCommentActions.comment,
        actions: releaseCommentActions.actions,
      },
    },
    action_id: '0818e5e0-6648-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: releaseCommentActions.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:48:30.616Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: {
        type: isolateCommentActionsMultipleTargets.type,
        owner: isolateCommentActionsMultipleTargets.owner,
        comment: isolateCommentActionsMultipleTargets.comment,
        actions: isolateCommentActionsMultipleTargets.actions,
      },
    },
    action_id: '0818e5e0-6648-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: isolateCommentActionsMultipleTargets.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:48:30.616Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: {
        type: commentExternalReference.type,
        owner: commentExternalReference.owner,
        externalReferenceId: commentExternalReference.externalReferenceId,
        externalReferenceAttachmentTypeId:
          commentExternalReference.externalReferenceAttachmentTypeId,
        externalReferenceMetadata: commentExternalReference.externalReferenceMetadata,
        externalReferenceStorage: commentExternalReference.externalReferenceStorage,
      },
    },
    action_id: '0818e5e0-6648-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: commentExternalReference.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:48:30.616Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: {
        type: commentPersistableState.type,
        owner: commentPersistableState.owner,
        persistableStateAttachmentState: commentPersistableState.persistableStateAttachmentState,
        persistableStateAttachmentTypeId: commentPersistableState.persistableStateAttachmentTypeId,
      },
    },
    action_id: '0818e5e0-6648-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: commentPersistableState.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'pushed',
    action: Actions.push_to_service,
    created_at: '2021-02-03T17:45:29.400Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      externalService: {
        pushed_at: '2021-02-03T17:45:29.400Z',
        pushed_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
        connector_id: '456',
        connector_name: 'ServiceNow SN',
        external_id: 'external-id',
        external_title: 'SIR0010037',
        external_url:
          'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
      },
    },
    action_id: '9b91d8f0-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: null,
    owner: SECURITY_SOLUTION_OWNER,
  },
  {
    type: 'comment',
    action: Actions.create,
    created_at: '2021-02-03T17:48:30.616Z',
    created_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    payload: {
      comment: { comment: comment.comment, type: comment.type, owner: comment.owner },
    },
    action_id: '0818e5e0-6648-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: comment.id,
    owner: SECURITY_SOLUTION_OWNER,
  },
];
