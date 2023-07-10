/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../mock';
import { useUiSetting$ } from '../../../lib/kibana';

import { BulkAlertTagsPanel } from './alert_bulk_tags';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useSetAlertTags } from './use_set_alert_tags';
import { getUpdateAlertsQuery } from './helpers';

jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_app_toasts');
jest.mock('./use_set_alert_tags');
jest.mock('./helpers');

const mockTagItems = [
  {
    _id: 'test-id',
    data: [{ field: ALERT_WORKFLOW_TAGS, value: ['tag-1', 'tag-2'] }],
    ecs: { _id: 'test-id' },
  },
];

(useUiSetting$ as jest.Mock).mockReturnValue(['default-test-tag']);
(useAppToasts as jest.Mock).mockReturnValue({
  addError: jest.fn(),
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
});
(useSetAlertTags as jest.Mock).mockReturnValue([false, jest.fn()]);
(getUpdateAlertsQuery as jest.Mock).mockReturnValue({ query: {} });

describe('BulkAlertTagsPanel', () => {
  test('it renders', () => {
    const wrapper = render(
      <TestProviders>
        <BulkAlertTagsPanel
          alertItems={mockTagItems}
          setIsLoading={() => {}}
          closePopoverMenu={() => {}}
        />
      </TestProviders>
    );

    expect(wrapper.getByTestId('alert-tags-selectable-menu')).toBeInTheDocument();
  });
});
