/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { UserActionActions } from '../../../common/types/domain';
import { elasticUser, getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createAssigneesUserActionBuilder, shouldAddAnd, shouldAddComma } from './assignees';
import { getMockBuilderArgs } from './mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createAssigneesUserActionBuilder', () => {
  describe('shouldAddComma', () => {
    it('returns false if there are only 2 items', () => {
      expect(shouldAddComma(0, 2)).toBeFalsy();
    });

    it('returns false it is the last items', () => {
      expect(shouldAddComma(2, 3)).toBeFalsy();
    });
  });

  describe('shouldAddAnd', () => {
    it('returns false if there is only 1 item', () => {
      expect(shouldAddAnd(0, 1)).toBeFalsy();
    });

    it('returns false it is not the last items', () => {
      expect(shouldAddAnd(1, 3)).toBeFalsy();
    });
  });

  describe('component', () => {
    const builderArgs = getMockBuilderArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders assigned users', async () => {
      const userAction = getUserAction('assignees', UserActionActions.add, {
        createdBy: {
          // damaged_raccoon uid
          profileUid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
      });
      const builder = createAssigneesUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(await screen.findByText('assigned')).toBeInTheDocument();
      expect(await screen.findByText('themselves')).toBeInTheDocument();
      expect(await screen.findByText('Physical Dinosaur')).toBeInTheDocument();

      expect(await screen.findByTestId('ua-assignee-physical_dinosaur')).toContainElement(
        await screen.findByText('and')
      );
    });

    it('renders assigned users with a comma', async () => {
      const userAction = getUserAction('assignees', UserActionActions.add, {
        createdBy: {
          // damaged_raccoon uid
          profileUid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
        payload: {
          assignees: [
            // These values map to uids in x-pack/plugins/cases/public/containers/user_profiles/api.mock.ts
            { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' },
            { uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0' },
            { uid: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0' },
          ],
        },
      });
      const builder = createAssigneesUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(await screen.findByText('assigned')).toBeInTheDocument();
      expect(await screen.findByText('themselves,')).toBeInTheDocument();
      expect(await screen.findByText('Physical Dinosaur')).toBeInTheDocument();

      expect(await screen.findByTestId('ua-assignee-physical_dinosaur')).toContainElement(
        await screen.findByText(',')
      );

      expect(await screen.findByText('Wet Dingo')).toBeInTheDocument();
      expect(await screen.findByTestId('ua-assignee-wet_dingo')).toContainElement(
        await screen.findByText('and')
      );
    });

    it('renders unassigned users', async () => {
      const userAction = getUserAction('assignees', UserActionActions.delete, {
        createdBy: {
          // damaged_raccoon uid
          profileUid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
      });
      const builder = createAssigneesUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(await screen.findByText('unassigned')).toBeInTheDocument();
      expect(await screen.findByText('themselves')).toBeInTheDocument();
      expect(await screen.findByText('Physical Dinosaur')).toBeInTheDocument();

      expect(await screen.findByTestId('ua-assignee-physical_dinosaur')).toContainElement(
        await screen.findByText('and')
      );
    });

    it('renders a single assigned user', async () => {
      const userAction = getUserAction('assignees', UserActionActions.add, {
        payload: {
          assignees: [
            // only render the physical dinosaur
            { uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0' },
          ],
        },
      });
      const builder = createAssigneesUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(await screen.findByText('Physical Dinosaur')).toBeInTheDocument();
      expect(screen.queryByText('themselves,')).not.toBeInTheDocument();
      expect(screen.queryByText('and')).not.toBeInTheDocument();
    });

    it('renders a single assigned user that is themselves using matching profile uids', async () => {
      const userAction = getUserAction('assignees', UserActionActions.add, {
        createdBy: {
          ...elasticUser,
          profileUid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
        payload: {
          assignees: [
            // only render the damaged raccoon which is the current user
            { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' },
          ],
        },
      });
      const builder = createAssigneesUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(await screen.findByText('themselves')).toBeInTheDocument();
      expect(screen.queryByText('Physical Dinosaur')).not.toBeInTheDocument();
      expect(screen.queryByText('and')).not.toBeInTheDocument();
    });

    it('renders a single assigned user that is themselves using matching usernames', async () => {
      const userAction = getUserAction('assignees', UserActionActions.add, {
        createdBy: {
          ...elasticUser,
          username: 'damaged_raccoon',
        },
        payload: {
          assignees: [
            // only render the damaged raccoon which is the current user
            { uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' },
          ],
        },
      });
      const builder = createAssigneesUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      render(
        <TestProviders>
          <EuiCommentList comments={createdUserAction} />
        </TestProviders>
      );

      expect(await screen.findByText('themselves')).toBeInTheDocument();
      expect(screen.queryByText('Physical Dinosaur')).not.toBeInTheDocument();
      expect(screen.queryByText('and')).not.toBeInTheDocument();
    });
  });
});
