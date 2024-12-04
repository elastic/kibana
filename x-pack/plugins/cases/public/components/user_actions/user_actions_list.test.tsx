/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line @kbn/eslint/module_migration
import routeData from 'react-router';

import { basicCase, caseUserActions, getUserAction } from '../../containers/mock';
import { UserActionsList } from './user_actions_list';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { UserActionActions } from '../../../common/types/domain';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { getMockBuilderArgs } from './mock';

const builderArgs = getMockBuilderArgs();

const defaultProps = {
  caseUserActions,
  ...builderArgs,
  caseConnectors: getCaseConnectorsMockResponse(),
  data: basicCase,
  manualAlertsData: { 'some-id': { _id: 'some-id' } },
};

jest.mock('../../common/lib/kibana');

// FLAKY: https://github.com/elastic/kibana/issues/176524
describe.skip(`UserActionsList`, () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(routeData, 'useParams').mockReturnValue({ detailName: 'case-id' });
    appMockRender = createAppMockRenderer();
  });

  it('renders list correctly with isExpandable option', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} isExpandable />);

    expect(await screen.findByTestId('user-actions-list')).toBeInTheDocument();
  });

  it('renders list correctly with isExpandable=false option', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} />);

    expect(await screen.findByTestId('user-actions-list')).toBeInTheDocument();
  });

  it('renders user actions correctly', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} />);

    expect(await screen.findByTestId(`description-create-action-${caseUserActions[0].id}`));
    expect(await screen.findByTestId(`comment-create-action-${caseUserActions[1].commentId}`));
    expect(await screen.findByTestId(`description-update-action-${caseUserActions[2].id}`));
  });

  it('renders bottom actions correctly', async () => {
    const userName = 'Username';
    const sample = 'This is an add comment bottom actions';

    const bottomActions = [
      {
        username: <div>{userName}</div>,
        'data-test-subj': 'add-comment',
        timelineAvatar: null,
        className: 'isEdit',
        children: <span>{sample}</span>,
      },
    ];

    appMockRender.render(<UserActionsList {...defaultProps} bottomActions={bottomActions} />);

    expect(await screen.findByTestId('user-actions-list')).toBeInTheDocument();
    expect(await screen.findByTestId('add-comment')).toBeInTheDocument();
  });

  it('Outlines comment when url param is provided', async () => {
    const commentId = 'basic-comment-id';
    jest.spyOn(routeData, 'useParams').mockReturnValue({ commentId });

    const ourActions = [getUserAction('comment', UserActionActions.create)];

    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    appMockRender.render(<UserActionsList {...props} />);

    expect(
      (await screen.findAllByTestId(`comment-create-action-${commentId}`))[0]?.classList.contains(
        'outlined'
      )
    ).toBe(true);
  });

  // TODO Skipped after update to userEvent v14, the final assertion doesn't pass
  // https://github.com/elastic/kibana/pull/189949
  it('Outlines comment when update move to link is clicked', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const ourActions = [
      getUserAction('comment', UserActionActions.create),
      getUserAction('comment', UserActionActions.update),
    ];

    const props = {
      ...defaultProps,
      caseUserActions: ourActions,
    };

    appMockRender.render(<UserActionsList {...props} />);
    expect(
      (
        await screen.findAllByTestId(`comment-create-action-${props.data.comments[0].id}`)
      )[0]?.classList.contains('outlined')
    ).toBe(false);

    expect(
      (
        await screen.findAllByTestId(`comment-create-action-${props.data.comments[0].id}`)
      )[0]?.classList.contains('outlined')
    ).toBe(false);

    await user.click(await screen.findByTestId(`comment-update-action-${ourActions[1].id}`));

    expect(
      (
        await screen.findAllByTestId(`comment-create-action-${props.data.comments[0].id}`)
      )[0]?.classList.contains('outlined')
    ).toBe(true);
  });
});
