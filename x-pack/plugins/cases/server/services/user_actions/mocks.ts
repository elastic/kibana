/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import type { CasePostRequest } from '../../../common/types/api';
import { createCaseSavedObjectResponse } from '../test_utils';
import { transformSavedObjectToExternalModel } from '../cases/transform';
import { alertComment, comment } from '../../mocks';
import type { UserActionsDict } from './types';
import {
  CaseSeverity,
  CaseStatuses,
  ConnectorTypes,
  CustomFieldTypes,
} from '../../../common/types/domain';
import type { PatchCasesArgs } from '../cases/types';

export const casePayload: CasePostRequest = {
  title: 'Case SIR',
  tags: ['sir'],
  description: 'testing sir',
  connector: {
    id: '456',
    name: 'ServiceNow SN',
    type: ConnectorTypes.serviceNowSIR as const,
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
  severity: CaseSeverity.LOW,
  owner: SECURITY_SOLUTION_OWNER,
  assignees: [{ uid: '1' }],
};

export const externalService = {
  pushed_at: '2021-02-03T17:41:26.108Z',
  pushed_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
  connector_id: '456',
  connector_name: 'ServiceNow SN',
  external_id: 'external-id',
  external_title: 'SIR0010037',
  external_url:
    'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
};

export const originalCases = [
  { ...createCaseSavedObjectResponse(), id: '1' },
  { ...createCaseSavedObjectResponse(), id: '2' },
].map((so) => transformSavedObjectToExternalModel(so));

export const patchCasesRequest = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      type: CASE_SAVED_OBJECT,
      updatedAttributes: {
        title: 'updated title',
        status: CaseStatuses.closed,
        connector: casePayload.connector,
        category: 'pizza toppings',
      },
      originalCase: originalCases[0],
      references: [],
    },
    {
      ...createCaseSavedObjectResponse(),
      caseId: '2',
      type: CASE_SAVED_OBJECT,
      updatedAttributes: {
        description: 'updated desc',
        tags: ['one', 'two'],
        settings: { syncAlerts: false },
        severity: CaseSeverity.CRITICAL,
      },
      originalCase: originalCases[1],
      references: [],
    },
  ],
};

const originalCasesWithAssignee = [
  { ...createCaseSavedObjectResponse({ overrides: { assignees: [{ uid: '1' }] } }), id: '1' },
].map((so) => transformSavedObjectToExternalModel(so));

export const patchAssigneesCasesRequest = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        assignees: [{ uid: '1' }],
      },
      originalCase: originalCases[0],
    },
  ],
};

export const patchRemoveAssigneesCasesRequest = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        assignees: [],
      },
      originalCase: originalCasesWithAssignee[0],
    },
  ],
};

export const patchAddRemoveAssigneesCasesRequest = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        assignees: [{ uid: '2' }],
      },
      originalCase: originalCasesWithAssignee[0],
    },
  ],
};

export const patchTagsCasesRequest = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        tags: ['a', 'b'],
      },
      originalCase: originalCases[0],
    },
  ],
};

const originalCasesWithCustomFields = [
  {
    ...createCaseSavedObjectResponse({
      overrides: {
        customFields: [
          {
            key: 'string_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'old value',
          },
          {
            key: 'string_custom_field_2',
            type: CustomFieldTypes.TEXT,
            value: 'old value 2',
          },
        ],
      },
    }),
    id: '1',
  },
].map((so) => transformSavedObjectToExternalModel(so));

export const patchAddCustomFieldsToOriginalCasesRequest: PatchCasesArgs = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        customFields: [
          {
            key: 'string_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'this is a text field value',
          },
        ],
      },
      originalCase: originalCases[0],
    },
  ],
};

export const patchUpdateCustomFieldsCasesRequest: PatchCasesArgs = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        customFields: [
          {
            key: 'string_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'updated value',
          },
          {
            key: 'string_custom_field_2',
            type: CustomFieldTypes.TEXT,
            value: 'old value 2',
          },
        ],
      },
      originalCase: originalCasesWithCustomFields[0],
    },
  ],
};

export const patchUpdateResetCustomFieldsCasesRequest: PatchCasesArgs = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        customFields: [
          {
            key: 'string_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: null,
          },
          {
            key: 'string_custom_field_2',
            type: CustomFieldTypes.TEXT,
            value: 'new custom field 2',
          },
        ],
      },
      originalCase: originalCasesWithCustomFields[0],
    },
  ],
};

export const patchNewCustomFieldConfAdded: PatchCasesArgs = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        customFields: [
          {
            key: 'string_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'new value',
          },
          {
            key: 'string_custom_field_2',
            type: CustomFieldTypes.TEXT,
            value: 'old value 2',
          },
          {
            key: 'string_custom_field_3',
            type: CustomFieldTypes.TEXT,
            value: null,
          },
        ],
      },
      originalCase: originalCasesWithCustomFields[0],
    },
  ],
};

export const patchCustomFieldConfRemoved: PatchCasesArgs = {
  cases: [
    {
      ...createCaseSavedObjectResponse(),
      caseId: '1',
      updatedAttributes: {
        customFields: [
          {
            key: 'string_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'new value',
          },
        ],
      },
      originalCase: originalCasesWithCustomFields[0],
    },
  ],
};

export const attachments = [
  { id: '1', attachment: { ...comment }, owner: SECURITY_SOLUTION_OWNER },
  { id: '2', attachment: { ...alertComment }, owner: SECURITY_SOLUTION_OWNER },
];

export const getBuiltUserActions = ({ isMock }: { isMock: boolean }): UserActionsDict => ({
  '1': [
    {
      eventDetails: {
        action: 'update',
        descriptiveAction: 'case_user_action_update_case_title',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'update',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            title: 'updated title',
          },
          type: 'title',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'update',
        descriptiveAction: 'case_user_action_update_case_status',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'update',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            status: 'closed',
          },
          type: 'status',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'update',
        descriptiveAction: 'case_user_action_update_case_connector',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'update',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            connector: {
              fields: {
                category: 'Denial of Service',
                destIp: true,
                malwareHash: true,
                malwareUrl: true,
                priority: '2',
                sourceIp: true,
                subcategory: '45',
              },
              name: 'ServiceNow SN',
              type: '.servicenow-sir',
            },
          },
          type: 'connector',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
          {
            id: '456',
            name: 'connectorId',
            type: 'action',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'update',
        descriptiveAction: 'case_user_action_update_case_category',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'update',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            category: 'pizza toppings',
          },
          type: 'category',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
  ],
  '2': [
    {
      eventDetails: {
        action: 'update',
        descriptiveAction: 'case_user_action_update_case_description',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '2',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'update',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            description: 'updated desc',
          },
          type: 'description',
        },
        references: [
          {
            id: '2',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'add',
        descriptiveAction: 'case_user_action_add_case_tags',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '2',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'add',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            tags: ['one', 'two'],
          },
          type: 'tags',
        },
        references: [
          {
            id: '2',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'delete',
        descriptiveAction: 'case_user_action_delete_case_tags',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '2',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'delete',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            tags: ['defacement'],
          },
          type: 'tags',
        },
        references: [
          {
            id: '2',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'update',
        descriptiveAction: 'case_user_action_update_case_settings',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '2',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'update',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            settings: {
              syncAlerts: false,
            },
          },
          type: 'settings',
        },
        references: [
          {
            id: '2',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'update',
        descriptiveAction: 'case_user_action_update_case_severity',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '2',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'update',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            severity: 'critical',
          },
          type: 'severity',
        },
        references: [
          {
            id: '2',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
  ],
});

export const getAssigneesAddedUserActions = ({ isMock }: { isMock: boolean }): UserActionsDict => ({
  '1': [
    {
      eventDetails: {
        action: 'add',
        descriptiveAction: 'case_user_action_add_case_assignees',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'add',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            assignees: [
              {
                uid: '1',
              },
            ],
          },
          type: 'assignees',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
  ],
});

export const getAssigneesRemovedUserActions = ({
  isMock,
}: {
  isMock: boolean;
}): UserActionsDict => ({
  '1': [
    {
      eventDetails: {
        action: 'delete',
        descriptiveAction: 'case_user_action_delete_case_assignees',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'delete',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            assignees: [
              {
                uid: '1',
              },
            ],
          },
          type: 'assignees',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
  ],
});

export const getAssigneesAddedRemovedUserActions = ({
  isMock,
}: {
  isMock: boolean;
}): UserActionsDict => ({
  '1': [
    {
      eventDetails: {
        action: 'add',
        descriptiveAction: 'case_user_action_add_case_assignees',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'add',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            assignees: [
              {
                uid: '2',
              },
            ],
          },
          type: 'assignees',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'delete',
        descriptiveAction: 'case_user_action_delete_case_assignees',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'delete',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            assignees: [
              {
                uid: '1',
              },
            ],
          },
          type: 'assignees',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
  ],
});

export const getTagsAddedRemovedUserActions = ({
  isMock,
}: {
  isMock: boolean;
}): UserActionsDict => ({
  '1': [
    {
      eventDetails: {
        action: 'add',
        descriptiveAction: 'case_user_action_add_case_tags',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'add',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            tags: ['a', 'b'],
          },
          type: 'tags',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
    {
      eventDetails: {
        action: 'delete',
        descriptiveAction: 'case_user_action_delete_case_tags',
        getMessage: isMock ? jest.fn() : expect.any(Function),
        savedObjectId: '1',
        savedObjectType: 'cases',
      },
      parameters: {
        attributes: {
          action: 'delete',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            tags: ['defacement'],
          },
          type: 'tags',
        },
        references: [
          {
            id: '1',
            name: 'associated-cases',
            type: 'cases',
          },
        ],
      },
    },
  ],
});
