/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { EventActionOptions, SeverityActionOptions } from '.././types';
import SwimlaneParamsFields from './swimlane_params';
import { DocLinksStart } from 'kibana/public';
import { coreMock } from 'src/core/public/mocks';

describe('SwimlaneParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const mocks = coreMock.createSetup();
    const actionParams = {
      alertName: 'alert name',
      tags: 'tags',
      comments: 'my comments',
      severity: SeverityActionOptions.CRITICAL,
    };

    const wrapper = mountWithIntl(
      <SwimlaneParamsFields
        actionParams={actionParams}
        errors={{ summary: [], timestamp: [], dedupKey: [] }}
        editAction={() => {}}
        index={0}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
        toastNotifications={mocks.notifications.toasts}
        http={mocks.http}
      />
    );
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      'critical'
    );
  });
});
