/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../connectors';
import {
  CaseConfigureAttributesRt,
  CaseConfigureRequestParamsRt,
  CaseConfigureResponseRt,
  CasesConfigurePatchRt,
  CasesConfigureRequestRt,
  GetConfigureFindRequestRt,
} from './configure';

describe('configure', () => {
  const JiraConnector = {
    id: '1',
    name: ConnectorTypes.jira,
    fields: [
      { key: 'issueType', value: 'bug' },
      { key: 'priority', value: 'high' },
      { key: 'parent', value: '2' },
    ],
    type: ConnectorTypes.jira,
  };

  const serviceNow = {
    id: 'servicenow-1',
    name: 'SN 1',
    type: ConnectorTypes.serviceNowITSM,
    fields: null,
  };

  const resilient = {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  };

  describe('CasesConfigureRequestRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      owner: 'Cases',
    };

    it('has expected attributes in request', () => {
      const query = CasesConfigureRequestRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesConfigureRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesConfigurePatchRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      version: 'WzQ3LDFd',
    };

    it('has expected attributes in request', () => {
      const query = CasesConfigurePatchRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CasesConfigurePatchRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseConfigureAttributesRt', () => {
    const defaultRequest = {
      connector: resilient,
      closure_type: 'close-by-user',
      owner: 'cases',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      updated_at: '2020-02-19T23:06:33.798Z',
      updated_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
    };

    it('has expected attributes in request', () => {
      const query = CaseConfigureAttributesRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseConfigureAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseConfigureResponseRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      updated_at: '2020-02-19T23:06:33.798Z',
      updated_by: null,
      mappings: [
        {
          source: 'description',
          target: 'description',
          action_type: 'overwrite',
        },
      ],
      owner: 'cases',
      version: 'WzQ3LDFd',
      id: 'case-id',
      error: null,
    };

    it('has expected attributes in request', () => {
      const query = CaseConfigureResponseRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseConfigureResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('GetConfigureFindRequestRt', () => {
    const defaultRequest = {
      owner: ['cases'],
    };

    it('has expected attributes in request', () => {
      const query = GetConfigureFindRequestRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = GetConfigureFindRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseConfigureRequestParamsRt', () => {
    const defaultRequest = {
      configuration_id: 'basic-configuration-id',
    };

    it('has expected attributes in request', () => {
      const query = CaseConfigureRequestParamsRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseConfigureRequestParamsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
