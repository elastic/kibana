/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../connectors';
import { CasesConfigurePatchRt } from './configure';

describe('configure', () => {
  //   describe('CasesConfigureRequestRt', () => {
  //     const JiraConnector = {
  //       id: '1',
  //       name: ConnectorTypes.jira,
  //       fields: [
  //         { key: 'issueType', value: 'bug' },
  //         { key: 'priority', value: 'high' },
  //         { key: 'parent', value: '2' },
  //       ],
  //       type: ConnectorTypes.jira,
  //     };

  //     const serviceNow = {
  //         id: 'servicenow-1',
  //         name: 'SN 1',
  //         type: ConnectorTypes.serviceNowITSM,
  //         fields: null,
  //       };

  //       const resilient = {
  //         id: 'resilient-2',
  //         name: 'Resilient',
  //         type: ConnectorTypes.resilient,
  //         fields: null,
  //       };

  //     const defaultRequest = {
  //       connector: serviceNow,
  //       closure_type: 'close-by-user',
  //       owner: 'Cases',
  //     };

  //     it('has expected attributes in request', () => {
  //       const query = CasesConfigureRequestRt.decode(defaultRequest);

  //       expect(query).toBeTruthy();
  //     });
  //   });

  describe('CasesConfigurePatchRt', () => {
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
    const defaultRequest = {
      connector: JiraConnector,
      closure_type: 'close-by-user',
      version: 1,
    };

    it('has expected attributes in request', () => {
      const query = CasesConfigurePatchRt.decode(defaultRequest);

      expect(query).toMatchInlineSnapshot(`Object {
        connector: JiraConnector,
        closure_type: 'close-by-user',
        version: 1,
      }`);
    });
  });
});
