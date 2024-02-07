/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { getUserAction } from '../../../containers/mock';
import { TestProviders } from '../../../common/mock';
import { createCustomFieldsUserActionBuilder } from './custom_fields';
import { getMockBuilderArgs } from '../mock';
import {
  CustomFieldTypes,
  UserActionActions,
  UserActionTypes,
} from '../../../../common/types/domain';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

describe('createCustomFieldsUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when a custom field is updated', () => {
    const userAction = getUserAction('customFields', UserActionActions.update);

    const builder = createCustomFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();

    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(
      screen.getByText('changed My test label 1 to "My text test value 1"')
    ).toBeInTheDocument();
  });

  it('renders correctly when a custom field is updated to an empty value: null', () => {
    const userAction = getUserAction('customFields', UserActionActions.update, {
      payload: {
        customFields: [
          {
            type: CustomFieldTypes.TEXT,
            key: 'test_key_1',
            value: null,
          },
        ],
      },
    });

    const builder = createCustomFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();

    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('changed My test label 1 to "None"')).toBeInTheDocument();
  });

  it('renders correctly when a custom field is updated to an empty value: empty array', () => {
    const userAction = getUserAction('customFields', UserActionActions.update, {
      payload: {
        customFields: [
          {
            type: CustomFieldTypes.TEXT,
            key: 'test_key_1',
            value: [],
          },
        ],
      },
    });

    const builder = createCustomFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();

    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('changed My test label 1 to "None"')).toBeInTheDocument();
  });

  it('renders correctly the label when the configuration is not found', () => {
    const userAction = getUserAction('customFields', UserActionActions.update);

    const builder = createCustomFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
      casesConfiguration: { ...builderArgs.casesConfiguration, customFields: [] },
    });

    const createdUserAction = builder.build();

    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('changed Unknown to "My text test value 1"')).toBeInTheDocument();
  });

  it('does not build any user actions if the payload is an empty array', () => {
    const userAction = getUserAction('customFields', UserActionActions.update);

    const builder = createCustomFieldsUserActionBuilder({
      ...builderArgs,
      userAction: {
        ...userAction,
        type: UserActionTypes.customFields,
        payload: { customFields: [] },
      },
      casesConfiguration: { ...builderArgs.casesConfiguration, customFields: [] },
    });

    const createdUserAction = builder.build();
    expect(createdUserAction).toEqual([]);
  });
});
