/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from '../../../common/api';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { getReporterFilter, getAssigneeFilter } from './get_filter_options';
import type { ReporterFilter, AssigneeFilter } from './get_filter_options';

describe('filter options', () => {
  const currentUserProfile = userProfiles[0];
  const currentUser = {
    email: 'elastic@elastic.co',
    fullName: 'Elastic',
    username: 'elastic',
  };

  const props: ReporterFilter = {
    currentUserProfile,
    currentUser,
    isLoadingCurrentUserProfile: false,
    recentCasesFilterBy: 'myRecentlyReported',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns reporters filters using currentUserProfile', () => {
    const expected: { reporters: User[] } = {
      reporters: [
        {
          email: userProfiles[0].user.email,
          username: userProfiles[0].user.username,
          full_name: userProfiles[0].user.full_name,
          profile_uid: userProfiles[0].uid,
        },
      ],
    };
    const result = getReporterFilter({ ...props });

    expect(result).toEqual(expected);
  });

  it('returns reporters filters using current user when currentUserProfile is null or loading', () => {
    const expected: { reporters: User[] } = {
      reporters: [
        {
          email: currentUser.email,
          username: currentUser.username,
          full_name: currentUser.fullName,
        },
      ],
    };
    const result = getReporterFilter({ ...props, currentUserProfile: undefined });

    expect(result).toEqual(expected);

    const newResult = getReporterFilter({ ...props, isLoadingCurrentUserProfile: true });

    expect(newResult).toEqual(expected);
  });

  it('returns empty reporters filters when filter is recentlyCreated', () => {
    const result = getReporterFilter({ ...props, recentCasesFilterBy: 'recentlyCreated' });

    expect(result).toEqual({ reporters: [] });
  });

  it('returns assignees filters', () => {
    const assigneeProps: AssigneeFilter = {
      currentUserProfile,
      isLoadingCurrentUserProfile: false,
    };
    const result = getAssigneeFilter({ ...assigneeProps });

    expect(result).toEqual({ assignees: [currentUserProfile.uid] });
  });

  it('returns empty assignees filters when when currentUserProfile is null or loading', () => {
    const result = getAssigneeFilter({
      currentUserProfile: undefined,
      isLoadingCurrentUserProfile: false,
    });

    expect(result).toEqual({ assignees: [] });

    const newResult = getAssigneeFilter({ currentUserProfile, isLoadingCurrentUserProfile: true });

    expect(newResult).toEqual({ assignees: [] });
  });
});
