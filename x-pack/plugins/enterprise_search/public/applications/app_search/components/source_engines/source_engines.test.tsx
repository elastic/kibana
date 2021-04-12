/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mountWithIntl } from '../../../__mocks__';
import { setMockActions } from '../../../__mocks__';

import React from 'react';

import { EuiPageHeader } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';

import { SourceEngines } from '.';

const MOCK_ACTIONS = {
  // FlashMessagesLogic
  dismissToastMessage: jest.fn(),
};

describe('SourceEngines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
  });

  it('renders', () => {
    const wrapper = mountWithIntl(<SourceEngines engineBreadcrumb={[]} />);

    expect(wrapper.find(EuiPageHeader).text()).toContain('Manage Engines');
    expect(wrapper.find(FlashMessages)).toHaveLength(1);
  });
});
