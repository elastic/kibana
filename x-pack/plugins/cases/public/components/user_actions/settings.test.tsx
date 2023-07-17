/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentList } from '@elastic/eui';
import React from 'react';
import { UserActionActions } from '../../../common/types/domain';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createSettingsUserActionBuilder } from './settings';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createStatusUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();
  let appMock: AppMockRenderer;

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  const tests = [
    [false, 'disabled'],
    [true, 'enabled'],
  ];

  it.each(tests)(
    'renders correctly when changed setting sync-alerts to %s',
    async (syncAlerts, label) => {
      const userAction = getUserAction('settings', UserActionActions.update, {
        payload: { settings: { syncAlerts } },
      });
      const builder = createSettingsUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      const result = appMock.render(<EuiCommentList comments={createdUserAction} />);

      expect(result.getByTestId('settings-update-action-settings-update')).toBeTruthy();
      expect(result.getByText(`${label} sync alerts`)).toBeTruthy();
    }
  );
});
