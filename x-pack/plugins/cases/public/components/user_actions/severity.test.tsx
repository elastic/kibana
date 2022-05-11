/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentList } from '@elastic/eui';
import { Actions, CaseSeverity } from '../../../common/api';
import React from 'react';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createSeverityUserActionBuilder } from './severity';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

const builderArgs = getMockBuilderArgs();
describe('createSeverityUserActionBuilder', () => {
  let appMockRenderer: AppMockRenderer;
  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });
  it('renders correctly', () => {
    const userAction = getUserAction('severity', Actions.update, {
      payload: { severity: CaseSeverity.LOW },
    });
    const builder = createSeverityUserActionBuilder({
      ...builderArgs,
      userAction,
    });
    const createdUserAction = builder.build();

    const result = appMockRenderer.render(<EuiCommentList comments={createdUserAction} />);
    expect(result.getByTestId('severity-update-user-action-severity-title')).toBeTruthy();
    expect(result.getByTestId('severity-update-user-action-severity-title-low')).toBeTruthy();
  });
});
