/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterMode } from './types';
import type { User } from '../../../common/api';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { getReporterFilter, getAssigneeFilter } from './get_filter_options';
import type { ReporterFiler, AssigneeFilter } from './get_filter_options';

describe('filter options', () => {
  const currentUserProfile = userProfiles[0];
  const currentUser = {
    email: 'elastic@elastic.co',
    fullName: 'Elastic',
    username: 'elastic',
  };
  const recentCasesFilterBy: FilterMode = 'recentlyCreated';
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns reporters filters using currentUserProfile', () => {
    const props: ReporterFiler = {
      currentUserProfile,
      currentUser,
      isLoadingCurrentUserProfile: false,
      recentCasesFilterBy: 'myRecentlyReported',
    };
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
    const props: ReporterFiler = {
      currentUserProfile: undefined,
      currentUser,
      isLoadingCurrentUserProfile: false,
      recentCasesFilterBy: 'myRecentlyReported',
    };
    const expected: { reporters: User[] } = {
      reporters: [
        {
          email: currentUser.email,
          username: currentUser.username,
          full_name: currentUser.fullName,
        },
      ],
    };
    const result = getReporterFilter({ ...props });

    expect(result).toEqual(expected);

    const newResult = getReporterFilter({ ...props, isLoadingCurrentUserProfile: true });

    expect(newResult).toEqual(expected);
  });

  it('returns empty reporters filters when filter is not myRecentlyReported', () => {
    const props: ReporterFiler = {
      currentUserProfile,
      currentUser,
      isLoadingCurrentUserProfile: false,
      recentCasesFilterBy,
    };
    const result = getReporterFilter({ ...props });

    expect(result).toEqual({ reporters: [] });
  });

  it('returns assignees filters', () => {
    const props: AssigneeFilter = {
      currentUserProfile,
      isLoadingCurrentUserProfile: false,
    };
    const result = getAssigneeFilter({ ...props });

    expect(result).toEqual({ assignees: [currentUserProfile.uid] });
  });

  it('returns empty assignees filters when when currentUserProfile is null or loading', () => {
    const props: AssigneeFilter = {
      currentUserProfile: undefined,
      isLoadingCurrentUserProfile: false,
    };
    const result = getAssigneeFilter({ ...props });

    expect(result).toEqual({ assignees: [] });

    const newResult = getAssigneeFilter({ currentUserProfile, isLoadingCurrentUserProfile: true });

    expect(newResult).toEqual({ assignees: [] });
  });
});
