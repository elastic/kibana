/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../types/domain/connector/v1';
import {
  RelatedCaseInfoRt,
  SettingsRt,
  CaseSeverity,
  CaseFullExternalServiceRt,
  CasesFindRequestRt,
  CasesByAlertIDRequestRt,
  CasePatchRequestRt,
  CasesPatchRequestRt,
  CasePushRequestParamsRt,
  ExternalServiceResponseRt,
  AllReportersFindRequestRt,
  CasesBulkGetRequestRt,
  CasesBulkGetResponseRt,
  CasePostRequestRt,
  CaseAttributesRt,
  CasesRt,
  CasesFindResponseRt,
  CaseResolveResponseRt,
} from './case';
import { CommentType } from './comment';
import { CaseStatuses } from './status';

const basicCase = {
  owner: 'cases',
  closed_at: null,
  closed_by: null,
  id: 'basic-case-id',
  comments: [
    {
      comment: 'Solve this fast!',
      type: CommentType.user,
      id: 'basic-comment-id',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      owner: 'cases',
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
      version: 'WzQ3LDFc',
    },
  ],
  created_at: '2020-02-19T23:06:33.798Z',
  created_by: {
    full_name: 'Leslie Knope',
    username: 'lknope',
    email: 'leslie.knope@elastic.co',
  },
  connector: {
    id: 'none',
    name: 'My Connector',
    type: ConnectorTypes.none,
    fields: null,
  },
  description: 'Security banana Issue',
  severity: CaseSeverity.LOW,
  duration: null,
  external_service: null,
  status: CaseStatuses.open,
  tags: ['coke', 'pepsi'],
  title: 'Another horrible breach!!',
  totalComment: 1,
  totalAlerts: 0,
  updated_at: '2020-02-20T15:02:57.995Z',
  updated_by: {
    full_name: 'Leslie Knope',
    username: 'lknope',
    email: 'leslie.knope@elastic.co',
  },
  version: 'WzQ3LDFd',
  settings: {
    syncAlerts: true,
  },
  // damaged_raccoon uid
  assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
  category: null,
};

describe('Case', () => {
  describe('RelatedCaseInfoRt', () => {
    const defaultRequest = {
      id: 'basic-case-id',
      title: 'basic-case-title',
      description: 'this is a simple description',
      status: CaseStatuses.open,
      createdAt: '2023-01-17T09:46:29.813Z',
      totals: {
        alerts: 5,
        userComments: 2,
      },
    };
    it('has expected attributes in request', () => {
      const query = RelatedCaseInfoRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = RelatedCaseInfoRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from totals', () => {
      const query = RelatedCaseInfoRt.decode({
        ...defaultRequest,
        totals: { ...defaultRequest.totals, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('SettingsRt', () => {
    it('has expected attributes in request', () => {
      const query = SettingsRt.decode({ syncAlerts: true });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { syncAlerts: true },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SettingsRt.decode({ syncAlerts: false, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { syncAlerts: false },
      });
    });
  });

  describe('CaseFullExternalServiceRt', () => {
    const defaultRequest = {
      connector_id: 'servicenow-1',
      connector_name: 'My SN connector',
      external_id: 'external_id',
      external_title: 'external title',
      external_url: 'basicPush.com',
      pushed_at: '2023-01-17T09:46:29.813Z',
      pushed_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
    };
    it('has expected attributes in request', () => {
      const query = CaseFullExternalServiceRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseFullExternalServiceRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from pushed_by', () => {
      const query = CaseFullExternalServiceRt.decode({
        ...defaultRequest,
        pushed_by: { ...defaultRequest.pushed_by, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseAttributesRt', () => {
    const defaultRequest = {
      description: 'A description',
      status: CaseStatuses.open,
      tags: ['new', 'case'],
      title: 'My new case',
      connector: {
        id: '123',
        name: 'My connector',
        type: ConnectorTypes.jira,
        fields: { issueType: 'Task', priority: 'High', parent: null },
      },
      settings: {
        syncAlerts: true,
      },
      owner: 'cases',
      severity: CaseSeverity.LOW,
      assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
      duration: null,
      closed_at: null,
      closed_by: null,
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      external_service: null,
      updated_at: '2020-02-20T15:02:57.995Z',
      updated_by: null,
      category: null,
    };

    it('has expected attributes in request', () => {
      const query = CaseAttributesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from connector', () => {
      const query = CaseAttributesRt.decode({
        ...defaultRequest,
        connector: { ...defaultRequest.connector, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from created_by', () => {
      const query = CaseAttributesRt.decode({
        ...defaultRequest,
        created_by: { ...defaultRequest.created_by, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasePostRequestRt', () => {
    const defaultRequest = {
      description: 'A description',
      tags: ['new', 'case'],
      title: 'My new case',
      connector: {
        id: '123',
        name: 'My connector',
        type: ConnectorTypes.jira,
        fields: { issueType: 'Task', priority: 'High', parent: null },
      },
      settings: {
        syncAlerts: true,
      },
      owner: 'cases',
      severity: CaseSeverity.LOW,
      assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
    };

    it('has expected attributes in request', () => {
      const query = CasePostRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasePostRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from connector', () => {
      const query = CasePostRequestRt.decode({
        ...defaultRequest,
        connector: { ...defaultRequest.connector, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesFindRequestRt', () => {
    const defaultRequest = {
      tags: ['new', 'case'],
      status: CaseStatuses.open,
      severity: CaseSeverity.LOW,
      assignees: ['damaged_racoon'],
      reporters: ['damaged_racoon'],
      defaultSearchOperator: 'AND',
      from: 'now',
      page: '1',
      perPage: '10',
      search: 'search text',
      searchFields: 'closed_by.username',
      rootSearchFields: ['_id'],
      to: '1w',
      sortOrder: 'desc',
      sortField: 'created_at',
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const query = CasesFindRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, page: 1, perPage: 10 },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesFindRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, page: 1, perPage: 10 },
      });
    });
  });

  describe('CasesByAlertIDRequestRt', () => {
    it('has expected attributes in request', () => {
      const query = CasesByAlertIDRequestRt.decode({ owner: 'cases' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { owner: 'cases' },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesByAlertIDRequestRt.decode({ owner: ['cases'], foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { owner: ['cases'] },
      });
    });
  });

  describe('CaseResolveResponseRt', () => {
    const defaultRequest = {
      case: { ...basicCase },
      outcome: 'exactMatch',
      alias_target_id: 'sample-target-id',
      alias_purpose: 'savedObjectConversion',
    };

    it('has expected attributes in request', () => {
      const query = CaseResolveResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseResolveResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesFindResponseRt', () => {
    const defaultRequest = {
      cases: [{ ...basicCase }],
      page: 1,
      per_page: 10,
      total: 20,
      count_open_cases: 10,
      count_in_progress_cases: 5,
      count_closed_cases: 5,
    };

    it('has expected attributes in request', () => {
      const query = CasesFindResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesFindResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from cases', () => {
      const query = CasesFindResponseRt.decode({
        ...defaultRequest,
        cases: [{ ...basicCase, foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasePatchRequestRt', () => {
    const defaultRequest = {
      id: 'basic-case-id',
      version: 'WzQ3LDFd',
      description: 'Updated description',
    };

    it('has expected attributes in request', () => {
      const query = CasePatchRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasePatchRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesPatchRequestRt', () => {
    const defaultRequest = {
      cases: [
        {
          id: 'basic-case-id',
          version: 'WzQ3LDFd',
          description: 'Updated description',
        },
      ],
    };

    it('has expected attributes in request', () => {
      const query = CasesPatchRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesPatchRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesRt', () => {
    const defaultRequest = [
      {
        ...basicCase,
      },
    ];

    it('has expected attributes in request', () => {
      const query = CasesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasePushRequestParamsRt', () => {
    const defaultRequest = {
      case_id: 'basic-case-id',
      connector_id: 'basic-connector-id',
    };

    it('has expected attributes in request', () => {
      const query = CasePushRequestParamsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasePushRequestParamsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ExternalServiceResponseRt', () => {
    const defaultRequest = {
      title: 'case_title',
      id: 'basic-case-id',
      pushedDate: '2020-02-19T23:06:33.798Z',
      url: 'https://atlassian.com',
      comments: [
        {
          commentId: 'basic-comment-id',
          pushedDate: '2020-02-19T23:06:33.798Z',
          externalCommentId: 'external-comment-id',
        },
      ],
    };

    it('has expected attributes in request', () => {
      const query = ExternalServiceResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ExternalServiceResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from comments', () => {
      const query = ExternalServiceResponseRt.decode({
        ...defaultRequest,
        comments: [{ ...defaultRequest.comments[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('AllReportersFindRequestRt', () => {
    const defaultRequest = {
      owner: ['cases', 'security-solution'],
    };

    it('has expected attributes in request', () => {
      const query = AllReportersFindRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AllReportersFindRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesBulkGetRequestRt', () => {
    const defaultRequest = {
      ids: ['case-1', 'case-2'],
    };

    it('has expected attributes in request', () => {
      const query = CasesBulkGetRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesBulkGetRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesBulkGetResponseRt', () => {
    const defaultRequest = {
      cases: [basicCase],
      errors: [
        {
          error: 'error',
          message: 'error-message',
          status: 403,
          caseId: 'basic-case-id',
        },
      ],
    };

    it('has expected attributes in request', () => {
      const query = CasesBulkGetResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesBulkGetResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from cases', () => {
      const query = CasesBulkGetResponseRt.decode({
        ...defaultRequest,
        cases: [{ ...defaultRequest.cases[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, cases: defaultRequest.cases },
      });
    });

    it('removes foo:bar attributes from errors', () => {
      const query = CasesBulkGetResponseRt.decode({
        ...defaultRequest,
        errors: [{ ...defaultRequest.errors[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
