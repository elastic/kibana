/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import {
  comment as commentObj,
  userActions,
  commentAlert,
  commentAlertMultipleIds,
  isolateCommentActions,
  releaseCommentActions,
  isolateCommentActionsMultipleTargets,
  commentExternalReference,
  commentPersistableState,
} from './mock';

import {
  createIncident,
  dedupAssignees,
  getClosedInfoForUpdate,
  getDurationForUpdate,
  getEntity,
  getLatestPushInfo,
  mapCaseFieldsToExternalSystemFields,
  formatComments,
  addKibanaInformationToDescription,
  fillMissingCustomFields,
  normalizeCreateCaseRequest,
} from './utils';
import type { CaseCustomFields, CustomFieldsConfiguration } from '../../../common/types/domain';
import {
  CaseStatuses,
  CustomFieldTypes,
  UserActionActions,
  CaseSeverity,
  ConnectorTypes,
} from '../../../common/types/domain';
import { flattenCaseSavedObject } from '../../common/utils';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { casesConnectors } from '../../connectors';
import { userProfiles, userProfilesMap } from '../user_profiles.mock';
import { mappings, mockCases } from '../../mocks';

const allComments = [
  commentObj,
  commentAlert,
  commentAlertMultipleIds,
  isolateCommentActions,
  releaseCommentActions,
  isolateCommentActionsMultipleTargets,
  commentExternalReference,
  commentPersistableState,
];

describe('utils', () => {
  describe('dedupAssignees', () => {
    it('removes duplicate assignees', () => {
      expect(dedupAssignees([{ uid: '123' }, { uid: '123' }, { uid: '456' }])).toEqual([
        { uid: '123' },
        { uid: '456' },
      ]);
    });

    it('leaves the array as it is when there are no duplicates', () => {
      expect(dedupAssignees([{ uid: '123' }, { uid: '456' }])).toEqual([
        { uid: '123' },
        { uid: '456' },
      ]);
    });

    it('returns undefined when the assignees is undefined', () => {
      expect(dedupAssignees()).toBeUndefined();
    });
  });

  describe('createIncident', () => {
    const theCase = {
      ...flattenCaseSavedObject({
        savedObject: mockCases[0],
      }),
      comments: [commentObj],
      totalComments: 1,
    };

    const connector = {
      id: '456',
      actionTypeId: '.jira',
      name: 'Connector without isCaseOwned',
      config: {
        apiUrl: 'https://elastic.jira.com',
      },
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
    };

    it('creates an external incident correctly for Jira', async () => {
      const res = await createIncident({
        theCase,
        userActions: [],
        connector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          summary: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.',
          externalId: null,
        },
        comments: [],
      });
    });

    it('creates an external incident correctly for SN', async () => {
      const snConnector = {
        ...connector,
        actionTypeId: '.servicenow',
      };

      const res = await createIncident({
        theCase,
        userActions: [],
        connector: snConnector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          category: null,
          subcategory: null,
          correlation_display: 'Elastic Case',
          correlation_id: 'mock-id-1',
          impact: null,
          severity: null,
          urgency: null,
          short_description: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.',
          externalId: null,
        },
        comments: [],
      });
    });

    it('creates an external incident correctly for SIR', async () => {
      const snConnector = {
        ...connector,
        actionTypeId: '.servicenow-sir',
      };

      const res = await createIncident({
        theCase,
        userActions: [],
        connector: snConnector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          additional_fields: null,
          category: null,
          subcategory: null,
          correlation_display: 'Elastic Case',
          correlation_id: 'mock-id-1',
          dest_ip: [],
          source_ip: [],
          malware_hash: [],
          malware_url: [],
          priority: null,
          short_description: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.',
          externalId: null,
        },
        comments: [],
      });
    });

    it('creates an external incident correctly for IBM Resilient', async () => {
      const resilientConnector = {
        ...connector,
        actionTypeId: '.resilient',
      };

      const res = await createIncident({
        theCase,
        userActions: [],
        connector: resilientConnector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          incidentTypes: null,
          severityCode: null,
          name: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.',
          externalId: null,
        },
        comments: [],
      });
    });

    it('creates an external incident correctly for Swimlane', async () => {
      const swimlaneConnector = {
        ...connector,
        actionTypeId: '.swimlane',
      };

      const res = await createIncident({
        theCase,
        userActions: [],
        connector: swimlaneConnector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          caseId: 'mock-id-1',
          caseName: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.',
          externalId: null,
        },
        comments: [],
      });
    });

    it('creates an external incident correctly for Cases webhook', async () => {
      const webhookConnector = {
        ...connector,
        actionTypeId: '.cases-webhook',
      };

      const res = await createIncident({
        theCase,
        userActions: [],
        connector: webhookConnector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          description: 'This is a brand new case of a bad meanie defacing data',
          externalId: null,
          id: 'mock-id-1',
          severity: 'low',
          status: 'open',
          tags: ['defacement'],
          title: 'Super Bad Security Issue',
        },
        comments: [],
      });
    });

    it('formats the connector fields correctly', async () => {
      const caseWithConnector = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[2],
        }),
        comments: [],
        totalComments: 0,
      };

      const res = await createIncident({
        theCase: caseWithConnector,
        userActions: [],
        connector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          priority: 'High',
          labels: ['LOLBins'],
          issueType: 'Task',
          parent: null,
          summary: 'Another bad one',
          description: 'Oh no, a bad meanie going LOLBins all over the place!\n\nAdded by elastic.',
          externalId: null,
        },
        comments: [],
      });
    });

    it('creates comments correctly', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          comments: [commentObj],
        },
        userActions,
        connector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res.comments).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
      ]);
    });

    it('adds the total alert comments correctly', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          comments: [commentObj, commentAlert, commentAlertMultipleIds],
        },
        userActions,
        connector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res.comments).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
        {
          comment: 'Elastic Alerts attached to the case: 3',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('filters out the alerts from the comments correctly', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          comments: [{ ...commentObj, id: 'comment-user-1' }, commentAlertMultipleIds],
        },
        userActions,
        connector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res.comments).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
        {
          comment: 'Elastic Alerts attached to the case: 2',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('does not add the alerts count comment if all alerts have been pushed', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          comments: [
            { ...commentObj, id: 'comment-user-1', pushed_at: '2019-11-25T21:55:00.177Z' },
            { ...commentAlertMultipleIds, pushed_at: '2019-11-25T21:55:00.177Z' },
          ],
        },
        userActions,
        connector,
        alerts: [],
        casesConnectors,
        spaceId: 'default',
      });

      expect(res.comments).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
      ]);
    });

    it('adds the backlink to cases correctly', async () => {
      const res = await createIncident({
        theCase,
        userActions: [],
        connector,
        alerts: [],
        casesConnectors,
        publicBaseUrl: 'https://example.com',
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          summary: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.\nFor more details, view this case in Kibana.\nCase URL: https://example.com/app/security/cases/mock-id-1',
          externalId: null,
        },
        comments: [],
      });
    });

    it('adds the backlink with spaceId to cases correctly', async () => {
      const res = await createIncident({
        theCase,
        userActions: [],
        connector,
        alerts: [],
        casesConnectors,
        publicBaseUrl: 'https://example.com',
        spaceId: 'test-space',
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          summary: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.\nFor more details, view this case in Kibana.\nCase URL: https://example.com/s/test-space/app/security/cases/mock-id-1',
          externalId: null,
        },
        comments: [],
      });
    });

    it('adds the user profile correctly to description', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          created_by: { ...theCase.created_by, profile_uid: userProfiles[0].uid },
          updated_by: null,
        },
        userActions: [],
        connector,
        alerts: [],
        casesConnectors,
        userProfiles: userProfilesMap,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          summary: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by Damaged Raccoon.',
          externalId: null,
        },
        comments: [],
      });
    });

    it('adds the user profile correctly to comments', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          created_by: { ...theCase.created_by, profile_uid: userProfiles[0].uid },
          updated_by: null,
          comments: [
            {
              ...commentObj,
              created_by: { ...theCase.created_by, profile_uid: userProfiles[0].uid },
              updated_by: null,
            },
          ],
          totalComment: 1,
        },
        userActions,
        connector,
        alerts: [],
        casesConnectors,
        userProfiles: userProfilesMap,
        spaceId: 'default',
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          summary: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data\n\nAdded by Damaged Raccoon.',
          externalId: 'external-id',
        },
        comments: [
          {
            comment: 'Wow, good luck catching that bad meanie!\n\nAdded by Damaged Raccoon.',
            commentId: 'comment-user-1',
          },
        ],
      });
    });

    it('does not map if the connector is not registered', async () => {
      const res = await createIncident({
        theCase,
        userActions: [],
        // @ts-expect-error: not existing connector
        connector: { actionTypeId: '.not-exist' },
        alerts: [],
        casesConnectors,
      });

      expect(res).toEqual({
        incident: {
          externalId: null,
        },
        comments: [],
      });
    });

    it('adds a backlink to the total alert comments correctly', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          comments: [commentObj, commentAlert, commentAlertMultipleIds],
        },
        userActions,
        connector,
        alerts: [],
        casesConnectors,
        publicBaseUrl: 'https://example.com',
        spaceId: 'default',
      });

      expect(res.comments).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
        {
          comment:
            'Elastic Alerts attached to the case: 3\n\nFor more details, view the alerts in Kibana\nAlerts URL: https://example.com/app/security/cases/mock-id-1/?tabId=alerts',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('adds a backlink with spaceId to the total alert comments correctly', async () => {
      const res = await createIncident({
        theCase: {
          ...theCase,
          comments: [commentObj, commentAlert, commentAlertMultipleIds],
        },
        userActions,
        connector,
        alerts: [],
        casesConnectors,
        publicBaseUrl: 'https://example.com',
        spaceId: 'test-space',
      });

      expect(res.comments).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
        {
          comment:
            'Elastic Alerts attached to the case: 3\n\nFor more details, view the alerts in Kibana\nAlerts URL: https://example.com/s/test-space/app/security/cases/mock-id-1/?tabId=alerts',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });
  });

  describe('mapCaseFieldsToExternalSystemFields', () => {
    const caseFields = { title: 'My title', description: 'my desc' };

    it('maps correctly', () => {
      expect(mapCaseFieldsToExternalSystemFields(caseFields, mappings)).toEqual({
        description: 'my desc',
        short_description: 'My title',
      });
    });

    it('does not map unknown case fields', () => {
      // @ts-expect-error
      expect(mapCaseFieldsToExternalSystemFields({ notCaseField: 'test' }, mappings)).toEqual({});
    });

    it('does not map unknown source', () => {
      expect(
        mapCaseFieldsToExternalSystemFields(caseFields, [
          {
            // @ts-expect-error
            source: 'not-a-case-field',
            target: 'short_description',
            action_type: 'overwrite',
          },
        ])
      ).toEqual({});
    });

    it('does not map if target=not_mapped', () => {
      expect(
        mapCaseFieldsToExternalSystemFields(caseFields, [
          {
            source: 'title',
            target: 'not_mapped',
            action_type: 'overwrite',
          },
        ])
      ).toEqual({});
    });
  });

  describe('formatComments', () => {
    it('formats comments correctly', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: allComments,
        totalComments: allComments.length,
      };

      const latestPushInfo = getLatestPushInfo('not-exists', userActions);

      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          spaceId: 'default',
        })
      ).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
        {
          comment:
            'Isolated host windows-host-1 with comment: Isolating this for investigation\n\nAdded by elastic.',
          commentId: 'mock-action-comment-1',
        },
        {
          comment:
            'Released host windows-host-1 with comment: Releasing this for investigation\n\nAdded by elastic.',
          commentId: 'mock-action-comment-2',
        },
        {
          comment:
            'Isolated host windows-host-1 and 1 more with comment: Isolating this for investigation\n\nAdded by elastic.',
          commentId: 'mock-action-comment-3',
        },
        {
          comment: 'Elastic Alerts attached to the case: 3',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('filters unsupported comments and adds the user profile information correctly', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: allComments.map((theComment) => ({
          ...theComment,
          created_by: { ...theComment.created_by, profile_uid: userProfiles[0].uid },
          updated_by: null,
        })),
        totalComments: allComments.length,
      };

      const latestPushInfo = getLatestPushInfo('not-exists', userActions);

      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          spaceId: 'default',
        })
      ).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by Damaged Raccoon.',
          commentId: 'comment-user-1',
        },
        {
          comment:
            'Isolated host windows-host-1 with comment: Isolating this for investigation\n' +
            '\n' +
            'Added by Damaged Raccoon.',
          commentId: 'mock-action-comment-1',
        },
        {
          comment:
            'Released host windows-host-1 with comment: Releasing this for investigation\n' +
            '\n' +
            'Added by Damaged Raccoon.',
          commentId: 'mock-action-comment-2',
        },
        {
          comment:
            'Isolated host windows-host-1 and 1 more with comment: Isolating this for investigation\n' +
            '\n' +
            'Added by Damaged Raccoon.',
          commentId: 'mock-action-comment-3',
        },
        {
          comment: 'Elastic Alerts attached to the case: 3',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('formats only comments that have not been pushed', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: allComments,
        totalComments: allComments.length,
      };

      const latestPushInfo = getLatestPushInfo('456', userActions);
      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          spaceId: 'default',
        })
      ).toEqual([
        {
          comment: 'Wow, good luck catching that bad meanie!\n\nAdded by elastic.',
          commentId: 'comment-user-1',
        },
        {
          comment: 'Elastic Alerts attached to the case: 3',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('filters out alert comments correctly and appends the total alerts on the end', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: [commentAlert],
        totalComments: 1,
      };

      const latestPushInfo = getLatestPushInfo('not-exists', userActions);

      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          spaceId: 'default',
        })
      ).toEqual([
        {
          comment: 'Elastic Alerts attached to the case: 1',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('returns an empty array when there are no comments', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: [],
        totalComments: 0,
      };

      const latestPushInfo = getLatestPushInfo('456', userActions);

      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          spaceId: 'default',
        })
      ).toEqual([]);
    });

    it('returns an empty array when there the comment has been pushed', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: [isolateCommentActions],
        totalComments: 1,
      };

      const latestPushInfo = getLatestPushInfo('456', userActions);

      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          spaceId: 'default',
        })
      ).toEqual([]);
    });

    it('adds a backlink to the total alerts comment', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: [commentAlert],
        totalComments: 1,
      };

      const latestPushInfo = getLatestPushInfo('not-exists', userActions);

      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          publicBaseUrl: 'https://example.com',
          spaceId: 'default',
        })
      ).toEqual([
        {
          comment:
            'Elastic Alerts attached to the case: 1\n\nFor more details, view the alerts in Kibana\nAlerts URL: https://example.com/app/security/cases/mock-id-1/?tabId=alerts',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('adds a backlink with spaceId to the total alerts comment', () => {
      const theCase = {
        ...flattenCaseSavedObject({
          savedObject: mockCases[0],
        }),
        comments: [commentAlert],
        totalComments: 1,
      };

      const latestPushInfo = getLatestPushInfo('not-exists', userActions);

      expect(
        formatComments({
          userActions,
          theCase,
          latestPushInfo,
          userProfiles: userProfilesMap,
          publicBaseUrl: 'https://example.com',
          spaceId: 'test-space',
        })
      ).toEqual([
        {
          comment:
            'Elastic Alerts attached to the case: 1\n\nFor more details, view the alerts in Kibana\nAlerts URL: https://example.com/s/test-space/app/security/cases/mock-id-1/?tabId=alerts',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });
  });

  describe('addKibanaInformationToDescription', () => {
    const theCase = {
      ...flattenCaseSavedObject({
        savedObject: mockCases[0],
      }),
      comments: [],
      totalComments: 0,
    };
    const publicBaseUrl = 'https://example.com';

    it('adds the kibana information to description correctly', () => {
      expect(
        addKibanaInformationToDescription(
          {
            ...theCase,
            created_by: { ...theCase.created_by, profile_uid: userProfiles[0].uid },
            updated_by: null,
          },
          'default',
          userProfilesMap,
          publicBaseUrl
        )
      ).toBe(
        'This is a brand new case of a bad meanie defacing data\n\nAdded by Damaged Raccoon.\nFor more details, view this case in Kibana.\nCase URL: https://example.com/app/security/cases/mock-id-1'
      );
    });

    it('adds the kibana information to description correctly without publicBaseUrl and userProfilesMap', () => {
      expect(addKibanaInformationToDescription(theCase, 'default')).toBe(
        'This is a brand new case of a bad meanie defacing data\n\nAdded by elastic.'
      );
    });

    it('adds the kibana information with spaceId to description correctly', () => {
      expect(
        addKibanaInformationToDescription(
          {
            ...theCase,
            created_by: { ...theCase.created_by, profile_uid: userProfiles[0].uid },
            updated_by: null,
          },
          'test-space',
          userProfilesMap,
          publicBaseUrl
        )
      ).toBe(
        'This is a brand new case of a bad meanie defacing data\n\nAdded by Damaged Raccoon.\nFor more details, view this case in Kibana.\nCase URL: https://example.com/s/test-space/app/security/cases/mock-id-1'
      );
    });
  });

  describe('getLatestPushInfo', () => {
    it('it returns the latest push information correctly', async () => {
      const res = getLatestPushInfo('456', userActions);
      expect(res).toEqual({
        index: 9,
        pushedInfo: {
          connector_id: '456',
          connector_name: 'ServiceNow SN',
          external_id: 'external-id',
          external_title: 'SIR0010037',
          external_url:
            'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
          pushed_at: '2021-02-03T17:45:29.400Z',
          pushed_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic',
            username: 'elastic',
          },
        },
      });
    });

    it('it returns null when there are not actions', async () => {
      const res = getLatestPushInfo('456', []);
      expect(res).toBe(null);
    });

    it('it returns null when there are no push user action', async () => {
      const res = getLatestPushInfo('456', [userActions[0]]);
      expect(res).toBe(null);
    });

    it('it returns the correct push information when with multiple push on different connectors', async () => {
      const res = getLatestPushInfo('456', [
        ...userActions.slice(0, 3),
        {
          type: 'pushed',
          action: UserActionActions.push_to_service,
          created_at: '2021-02-03T17:45:29.400Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic',
            username: 'elastic',
          },
          payload: {
            externalService: {
              pushed_at: '2021-02-03T17:45:29.400Z',
              pushed_by: {
                username: 'elastic',
                full_name: 'Elastic',
                email: 'elastic@elastic.co',
              },
              connector_id: '123',
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
      ]);

      expect(res).toEqual({
        index: 1,
        pushedInfo: {
          connector_id: '456',
          connector_name: 'ServiceNow SN',
          external_id: 'external-id',
          external_title: 'SIR0010037',
          external_url:
            'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
          pushed_at: '2021-02-03T17:41:26.108Z',
          pushed_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic',
            username: 'elastic',
          },
        },
      });
    });
  });

  describe('getClosedInfoForUpdate', () => {
    const date = '2021-02-03T17:41:26.108Z';
    const user = { full_name: 'Elastic', username: 'elastic', email: 'elastic@elastic.co' };

    it('returns the correct closed info when the case closes', async () => {
      expect(
        getClosedInfoForUpdate({ status: CaseStatuses.closed, closedDate: date, user })
      ).toEqual({
        closed_at: date,
        closed_by: user,
      });
    });

    it.each([[CaseStatuses.open], [CaseStatuses['in-progress']]])(
      'returns the correct closed info when the case %s',
      async (status) => {
        expect(getClosedInfoForUpdate({ status, closedDate: date, user })).toEqual({
          closed_at: null,
          closed_by: null,
        });
      }
    );

    it('returns undefined if the status is not provided', async () => {
      expect(getClosedInfoForUpdate({ closedDate: date, user })).toBe(undefined);
    });
  });

  describe('getDurationForUpdate', () => {
    const createdAt = '2021-11-23T19:00:00Z';
    const closedAt = '2021-11-23T19:02:00Z';

    it('returns the correct duration when the case closes', () => {
      expect(getDurationForUpdate({ status: CaseStatuses.closed, closedAt, createdAt })).toEqual({
        duration: 120,
      });
    });

    it.each([[CaseStatuses.open], [CaseStatuses['in-progress']]])(
      'returns the correct duration when the case %s',
      (status) => {
        expect(getDurationForUpdate({ status, closedAt, createdAt })).toEqual({
          duration: null,
        });
      }
    );

    it('returns undefined if the status is not provided', async () => {
      expect(getDurationForUpdate({ closedAt, createdAt })).toBe(undefined);
    });

    it.each([['invalid'], [null]])(
      'returns undefined if the createdAt date is %s',
      (createdAtInvalid) => {
        expect(
          getDurationForUpdate({
            status: CaseStatuses.closed,
            closedAt,
            // @ts-expect-error
            createdAt: createdAtInvalid,
          })
        ).toBe(undefined);
      }
    );

    it.each([['invalid'], [null]])(
      'returns undefined if the closedAt date is %s',
      (closedAtInvalid) => {
        expect(
          getDurationForUpdate({
            status: CaseStatuses.closed,
            // @ts-expect-error
            closedAt: closedAtInvalid,
            createdAt,
          })
        ).toBe(undefined);
      }
    );

    it('returns undefined if created_at > closed_at', async () => {
      expect(
        getDurationForUpdate({
          status: CaseStatuses.closed,
          closedAt: '2021-11-23T19:00:00Z',
          createdAt: '2021-11-23T19:05:00Z',
        })
      ).toBe(undefined);
    });

    it('rounds the seconds correctly', () => {
      expect(
        getDurationForUpdate({
          status: CaseStatuses.closed,
          createdAt: '2022-04-11T15:56:00.087Z',
          closedAt: '2022-04-11T15:58:56.187Z',
        })
      ).toEqual({
        duration: 176,
      });
    });

    it('rounds the zero correctly', () => {
      expect(
        getDurationForUpdate({
          status: CaseStatuses.closed,
          createdAt: '2022-04-11T15:56:00.087Z',
          closedAt: '2022-04-11T15:56:00.187Z',
        })
      ).toEqual({
        duration: 0,
      });
    });
  });

  describe('getEntity', () => {
    const userProfilesMapNoFullNames = new Map(
      Array.from(userProfilesMap.entries()).map((profileTuple) => [
        profileTuple[0],
        { ...profileTuple[1], user: { ...profileTuple[1].user, full_name: undefined } },
      ])
    );

    it('returns the username when full name is empty for updatedBy', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: null, username: null },
          updatedBy: { email: null, full_name: '', username: 'updatedBy_username' },
        })
      ).toEqual('updatedBy_username');
    });

    it('returns the username when full name is empty for createdBy', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: '', username: 'createdBy_username' },
          updatedBy: null,
        })
      ).toEqual('createdBy_username');
    });

    it('returns Unknown with neither updatedBy or createdBy are defined', () => {
      expect(
        getEntity({
          // @ts-expect-error
          createdBy: null,
          updatedBy: null,
        })
      ).toEqual('Unknown');
    });

    it('returns Unknown when createdBy fields are all null', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: null, username: null },
          updatedBy: null,
        })
      ).toEqual('Unknown');
    });

    it('returns the full name of updatedBy when available', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: 'createdBy_full_name', username: null },
          updatedBy: { full_name: 'updatedBy_full_name', email: null, username: null },
        })
      ).toEqual('updatedBy_full_name');
    });

    it('returns the username of updatedBy when available', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedBy: { full_name: null, email: null, username: 'updatedBy_username' },
        })
      ).toEqual('updatedBy_username');
    });

    it('returns Unknown when updatedBy username is null', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedBy: { full_name: null, email: null, username: null },
        })
      ).toEqual('Unknown');
    });

    it('returns the full name of createdBy when available', () => {
      expect(
        getEntity({
          createdBy: {
            email: null,
            full_name: 'createdBy_full_name',
            username: 'createdBy_username',
          },
          updatedBy: null,
        })
      ).toEqual('createdBy_full_name');
    });

    it('returns the username of createdBy when available', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedBy: null,
        })
      ).toEqual('createdBy_username');
    });

    it('returns updatedBy full name when the profile uid is not found', () => {
      expect(
        getEntity({
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedBy: {
            email: null,
            full_name: 'updatedBy_full_name',
            username: 'createdBy_username',
            profile_uid: '123',
          },
        })
      ).toEqual('updatedBy_full_name');
    });

    it('returns createdBy full name when the profile uid is not found', () => {
      expect(
        getEntity({
          createdBy: {
            email: null,
            full_name: 'createdBy_full_name',
            username: 'createdBy_username',
            profile_uid: '123',
          },
          updatedBy: null,
        })
      ).toEqual('createdBy_full_name');
    });

    it('returns updatedBy profile full name when the profile is found', () => {
      expect(
        getEntity(
          {
            createdBy: {
              email: null,
              full_name: null,
              username: null,
            },
            updatedBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
          },
          userProfilesMap
        )
      ).toEqual(userProfiles[0].user.full_name);
    });

    it('returns updatedBy profile username when the profile is found', () => {
      expect(
        getEntity(
          {
            createdBy: {
              email: null,
              full_name: null,
              username: null,
            },
            updatedBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
          },
          userProfilesMapNoFullNames
        )
      ).toEqual(userProfiles[0].user.username);
    });

    it('returns createdBy profile full name when the profile is found', () => {
      expect(
        getEntity(
          {
            createdBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
            updatedBy: null,
          },
          userProfilesMap
        )
      ).toEqual(userProfiles[0].user.full_name);
    });

    it('returns createdBy profile username when the profile is found', () => {
      expect(
        getEntity(
          {
            updatedBy: null,
            createdBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
          },
          userProfilesMapNoFullNames
        )
      ).toEqual(userProfiles[0].user.username);
    });
  });

  describe('fillMissingCustomFields', () => {
    const customFields: CaseCustomFields = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        value: 'this is a text field value',
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        value: null,
      },
      {
        key: 'third_key',
        type: CustomFieldTypes.TEXT,
        value: 'default value',
      },
      {
        key: 'fourth_key',
        type: CustomFieldTypes.TOGGLE,
        value: false,
      },
    ];

    const customFieldsConfiguration: CustomFieldsConfiguration = [
      {
        key: 'first_key',
        type: CustomFieldTypes.TEXT,
        label: 'foo',
        required: false,
      },
      {
        key: 'second_key',
        type: CustomFieldTypes.TOGGLE,
        label: 'foo',
        required: false,
      },
      {
        key: 'third_key',
        type: CustomFieldTypes.TEXT,
        label: 'foo',
        required: true,
        defaultValue: 'default value',
      },
      {
        key: 'fourth_key',
        type: CustomFieldTypes.TOGGLE,
        label: 'foo',
        required: true,
        defaultValue: false,
      },
    ];

    it('adds missing custom fields correctly', () => {
      expect(
        fillMissingCustomFields({
          customFields: [customFields[0]],
          customFieldsConfiguration,
        })
      ).toEqual(customFields);
    });

    it('uses the default value for optional custom fields', () => {
      expect(
        fillMissingCustomFields({
          customFields: [],
          customFieldsConfiguration: [
            // @ts-ignore: expected
            { ...customFieldsConfiguration[0], defaultValue: 'default value' },
            // @ts-ignore: expected
            { ...customFieldsConfiguration[1], defaultValue: true },
          ],
        })
      ).toEqual([
        { ...customFields[0], value: 'default value' },
        { ...customFields[1], value: true },
      ]);
    });

    it('does not set to null custom fields that exist', () => {
      expect(
        fillMissingCustomFields({
          customFields: [customFields[0], customFields[1]],
          customFieldsConfiguration,
        })
      ).toEqual(customFields);
    });

    it('does not update existing required custom fields to their default value', () => {
      const customFieldsToTest = [
        customFields[0],
        customFields[1],
        { ...customFields[2], value: 'not the default' },
        { ...customFields[3], value: true },
      ] as CaseCustomFields;

      expect(
        fillMissingCustomFields({
          customFields: customFieldsToTest,
          customFieldsConfiguration,
        })
      ).toEqual(customFieldsToTest);
    });

    it('does not insert missing required custom fields if default value is null', () => {
      const customFieldsToTest = [customFields[0], customFields[1]] as CaseCustomFields;

      expect(
        fillMissingCustomFields({
          customFields: customFieldsToTest,
          customFieldsConfiguration: [
            customFieldsConfiguration[0],
            customFieldsConfiguration[1],
            { ...customFieldsConfiguration[2], defaultValue: null },
            { ...customFieldsConfiguration[3], defaultValue: null },
          ],
        })
      ).toEqual(customFieldsToTest);
    });

    it('does not insert missing required custom fields if default value is undefined', () => {
      const customFieldsToTest = [customFields[0], customFields[1]] as CaseCustomFields;

      expect(
        fillMissingCustomFields({
          customFields: customFieldsToTest,
          customFieldsConfiguration: [
            customFieldsConfiguration[0],
            customFieldsConfiguration[1],
            { ...customFieldsConfiguration[2], defaultValue: undefined },
            { ...customFieldsConfiguration[3], defaultValue: undefined },
          ],
        })
      ).toEqual(customFieldsToTest);
    });

    it('returns all custom fields if they are more than the configuration', () => {
      expect(
        fillMissingCustomFields({
          customFields: [
            ...customFields,
            {
              key: 'extra 1',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
            {
              key: 'extra 2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
          customFieldsConfiguration,
        })
      ).toEqual([
        ...customFields,
        {
          key: 'extra 1',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
        {
          key: 'extra 2',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
      ]);
    });

    it('adds missing custom fields if they are undefined', () => {
      expect(
        fillMissingCustomFields({
          customFieldsConfiguration,
        })
      ).toEqual([
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          value: null,
        },
        {
          key: 'second_key',
          type: CustomFieldTypes.TOGGLE,
          value: null,
        },
        customFields[2],
        customFields[3],
      ]);
    });

    it('does not add missing fields if the customFieldsConfiguration is undefined', () => {
      expect(
        fillMissingCustomFields({
          customFields,
        })
      ).toEqual(customFields);
    });
  });
});

describe('normalizeCreateCaseRequest', () => {
  const theCase = {
    title: 'My Case',
    tags: [],
    description: 'testing sir',
    connector: {
      id: '.none',
      name: 'None',
      type: ConnectorTypes.none,
      fields: null,
    },
    settings: { syncAlerts: true },
    severity: CaseSeverity.LOW,
    owner: SECURITY_SOLUTION_OWNER,
    assignees: [{ uid: '1' }],
    category: 'my category',
    customFields: [],
  };

  it('should trim title', async () => {
    expect(normalizeCreateCaseRequest({ ...theCase, title: 'title with spaces      ' })).toEqual({
      ...theCase,
      title: 'title with spaces',
    });
  });

  it('should trim description', async () => {
    expect(
      normalizeCreateCaseRequest({
        ...theCase,
        description: 'this is a description with spaces!!      ',
      })
    ).toEqual({
      ...theCase,
      description: 'this is a description with spaces!!',
    });
  });

  it('should trim tags', async () => {
    expect(
      normalizeCreateCaseRequest({
        ...theCase,
        tags: ['pepsi     ', 'coke'],
      })
    ).toEqual({
      ...theCase,
      tags: ['pepsi', 'coke'],
    });
  });

  it('should trim category', async () => {
    expect(
      normalizeCreateCaseRequest({
        ...theCase,
        category: 'reporting       ',
      })
    ).toEqual({
      ...theCase,
      category: 'reporting',
    });
  });

  it('should set the category to null if missing', async () => {
    expect(normalizeCreateCaseRequest(omit(theCase, 'category'))).toEqual({
      ...theCase,
      category: null,
    });
  });

  it('should fill out missing custom fields', async () => {
    expect(
      normalizeCreateCaseRequest(omit(theCase, 'customFields'), [
        {
          key: 'first_key',
          type: CustomFieldTypes.TEXT,
          label: 'foo',
          required: false,
        },
      ])
    ).toEqual({
      ...theCase,
      customFields: [{ key: 'first_key', type: CustomFieldTypes.TEXT, value: null }],
    });
  });

  it('should set the customFields to an empty array if missing', async () => {
    expect(normalizeCreateCaseRequest(omit(theCase, 'customFields'))).toEqual({
      ...theCase,
      customFields: [],
    });
  });
});
