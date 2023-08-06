/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
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

describe(`UserActionsList`, () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(routeData, 'useParams').mockReturnValue({ detailName: 'case-id' });
    appMockRender = createAppMockRenderer();
  });

  it('renders list correctly with isExpandable option', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} isExpandable />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
    });
  });

  it('renders list correctly with isExpandable=false option', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
    });
  });

  it('renders user actions correctly', async () => {
    appMockRender.render(<UserActionsList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId(`description-create-action-${caseUserActions[0].id}`));
      expect(screen.getByTestId(`comment-create-action-${caseUserActions[1].commentId}`));
      expect(screen.getByTestId(`description-update-action-${caseUserActions[2].id}`));
    });
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

    await waitFor(() => {
      expect(screen.getByTestId('user-actions-list')).toBeInTheDocument();
      expect(screen.getByTestId('add-comment')).toBeInTheDocument();
    });
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
      await screen.findAllByTestId(`comment-create-action-${commentId}`)
    )[0]?.classList.contains('outlined');
  });

  it('Outlines comment when update move to link is clicked', async () => {
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
      screen
        .queryAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[0]
        ?.classList.contains('outlined')
    ).toBe(false);

    expect(
      screen
        .queryAllByTestId(`comment-create-action-${props.data.comments[0].id}`)[0]
        ?.classList.contains('outlined')
    ).toBe(false);

    userEvent.click(screen.getByTestId(`comment-update-action-${ourActions[1].id}`));

    expect(
      await screen.findAllByTestId(`comment-create-action-${props.data.comments[0].id}`)
    )[0]?.classList.contains('outlined');
  });
});
