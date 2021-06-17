/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import SwimlaneParamsFields from './swimlane_params';
import { SwimlaneConnectorType } from './types';
import { mappings } from './mocks';

describe('SwimlaneParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          ruleName: 'rule name',
          caseId: '3456789',
          caseName: 'my case name',
          severity: 'critical',
          description: 'case desc',
          externalId: null,
          alertId: '3456789',
        },
        comments: [],
      },
    };

    const connector = {
      secrets: {},
      config: { mappings, connectorType: SwimlaneConnectorType.All },
      id: 'test',
      actionTypeId: '.test',
      name: 'Test',
      isPreconfigured: false,
    };

    const wrapper = mountWithIntl(
      <SwimlaneParamsFields
        actionParams={actionParams}
        errors={{
          'subActionParams.incident.ruleName': [],
          'subActionParams.incident.alertId': [],
        }}
        actionConnector={connector}
        editAction={() => {}}
        index={0}
      />
    );

    expect(wrapper.find('[data-test-subj="severity"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="comments"]').exists()).toBeTruthy();
  });
});
