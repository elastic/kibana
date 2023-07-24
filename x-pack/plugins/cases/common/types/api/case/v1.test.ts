/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { AttachmentType } from '../../domain/attachment/v1';
import { CaseSeverity, CaseStatuses } from '../../domain/case/v1';
import { ConnectorTypes } from '../../domain/connector/v1';
import { CasesStatusRequestRt, CasesStatusResponseRt } from '../stats/v1';
import {
  AllReportersFindRequestRt,
  CasePatchRequestRt,
  CasePostRequestRt,
  CasePushRequestParamsRt,
  CaseResolveResponseRt,
  CasesBulkGetRequestRt,
  CasesBulkGetResponseRt,
  CasesByAlertIDRequestRt,
  CasesFindRequestRt,
  CasesFindRequestSearchFieldsRt,
  CasesFindRequestSortFieldsRt,
  CasesFindResponseRt,
  CasesPatchRequestRt,
} from './v1';

const basicCase = {
  owner: 'cases',
  closed_at: null,
  closed_by: null,
  id: 'basic-case-id',
  comments: [
    {
      comment: 'Solve this fast!',
      type: AttachmentType.user,
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

describe('Status', () => {
  describe('CasesStatusRequestRt', () => {
    const defaultRequest = {
      from: '2022-04-28T15:18:00.000Z',
      to: '2022-04-28T15:22:00.000Z',
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const query = CasesStatusRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has removes foo:bar attributes from request', () => {
      const query = CasesStatusRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesStatusResponseRt', () => {
    const defaultResponse = {
      count_closed_cases: 1,
      count_in_progress_cases: 2,
      count_open_cases: 1,
    };

    it('has expected attributes in response', () => {
      const query = CasesStatusResponseRt.decode(defaultResponse);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
      });
    });

    it('removes foo:bar attributes from response', () => {
      const query = CasesStatusResponseRt.decode({ ...defaultResponse, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
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
      searchFields: ['title', 'description'],
      to: '1w',
      sortOrder: 'desc',
      sortField: 'createdAt',
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

    const searchFields = Object.keys(CasesFindRequestSearchFieldsRt.keys);

    it.each(searchFields)('succeeds with %s as searchFields', (field) => {
      const query = CasesFindRequestRt.decode({ ...defaultRequest, searchFields: field });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, searchFields: field, page: 1, perPage: 10 },
      });
    });

    const sortFields = Object.keys(CasesFindRequestSortFieldsRt.keys);

    it.each(sortFields)('succeeds with %s as sortField', (sortField) => {
      const query = CasesFindRequestRt.decode({ ...defaultRequest, sortField });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, sortField, page: 1, perPage: 10 },
      });
    });

    it('removes rootSearchField when passed', () => {
      expect(
        PathReporter.report(
          CasesFindRequestRt.decode({ ...defaultRequest, rootSearchField: ['foobar'] })
        )
      ).toContain('No errors!');
    });

    describe('errors', () => {
      it('throws error when invalid searchField passed', () => {
        expect(
          PathReporter.report(
            CasesFindRequestRt.decode({ ...defaultRequest, searchFields: 'foobar' })
          )
        ).not.toContain('No errors!');
      });

      it('throws error when invalid sortField passed', () => {
        expect(
          PathReporter.report(CasesFindRequestRt.decode({ ...defaultRequest, sortField: 'foobar' }))
        ).not.toContain('No errors!');
      });

      it('succeeds when valid parameters passed', () => {
        expect(PathReporter.report(CasesFindRequestRt.decode(defaultRequest))).toContain(
          'No errors!'
        );
      });
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
