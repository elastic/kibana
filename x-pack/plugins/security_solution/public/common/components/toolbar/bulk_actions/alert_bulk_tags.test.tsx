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

jest.mock('../../../lib/kibana');

const mockTagItems = [
  {
    _id: 'test-id',
    data: [{ field: ALERT_WORKFLOW_TAGS, value: ['tag-1', 'tag-2'] }],
    ecs: { _id: 'test-id' },
  },
];

(useUiSetting$ as jest.Mock).mockReturnValue(['default-test-tag']);

describe('BulkAlertTagsPanel', () => {
  test('it renders', () => {
    const wrapper = render(
      <TestProviders>
        <BulkAlertTagsPanel
          alertItems={mockTagItems}
          setIsLoading={jest.fn()}
          closePopoverMenu={jest.fn()}
          onSubmit={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.getByTestId('alert-tags-selectable-menu')).toBeInTheDocument();
  });
});
