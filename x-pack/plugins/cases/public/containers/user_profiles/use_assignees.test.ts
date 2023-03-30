/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { renderHook } from '@testing-library/react-hooks';
import { userProfiles, userProfilesMap } from './api.mock';
import { useAssignees } from './use_assignees';

describe('useAssignees', () => {
  it('returns an empty array when the caseAssignees is empty', () => {
    const { result } = renderHook(() =>
      useAssignees({ caseAssignees: [], userProfiles: new Map() })
    );

    expect(result.current.allAssignees).toHaveLength(0);
    expect(result.current.assigneesWithProfiles).toHaveLength(0);
    expect(result.current.assigneesWithoutProfiles).toHaveLength(0);
  });

  it('returns all items in the with profiles array when they have profiles', () => {
    const { result } = renderHook(() =>
      useAssignees({
        caseAssignees: userProfiles.map((profile) => ({ uid: profile.uid })),
        userProfiles: userProfilesMap,
      })
    );

    expect(result.current.assigneesWithoutProfiles).toHaveLength(0);
    expect(result.current.allAssignees).toEqual(result.current.assigneesWithProfiles);
    expect(result.current.allAssignees).toEqual(userProfiles.map(asAssigneeWithProfile));
  });

  it('returns a sorted list of assignees with profiles', () => {
    const unsorted = [...userProfiles].reverse();
    const { result } = renderHook(() =>
      useAssignees({
        caseAssignees: unsorted.map((profile) => ({ uid: profile.uid })),
        userProfiles: userProfilesMap,
      })
    );

    expect(result.current.assigneesWithoutProfiles).toHaveLength(0);
    expect(result.current.allAssignees).toEqual(result.current.assigneesWithProfiles);
    expect(result.current.allAssignees).toEqual(userProfiles.map(asAssigneeWithProfile));
  });

  it('returns all items in the without profiles array when they do not have profiles', () => {
    const unknownProfiles = [{ uid: '1' }, { uid: '2' }];
    const { result } = renderHook(() =>
      useAssignees({
        caseAssignees: unknownProfiles,
        userProfiles: userProfilesMap,
      })
    );

    expect(result.current.assigneesWithoutProfiles).toHaveLength(2);
    expect(result.current.assigneesWithoutProfiles).toEqual(unknownProfiles);
    expect(result.current.allAssignees).toEqual(unknownProfiles);
  });

  it('returns 1 user with a valid profile and 1 user with no profile and combines them in the all field', () => {
    const assignees = [{ uid: '1' }, { uid: userProfiles[0].uid }];
    const { result } = renderHook(() =>
      useAssignees({
        caseAssignees: assignees,
        userProfiles: userProfilesMap,
      })
    );

    expect(result.current.assigneesWithProfiles).toHaveLength(1);
    expect(result.current.assigneesWithoutProfiles).toHaveLength(1);
    expect(result.current.allAssignees).toHaveLength(2);

    expect(result.current.assigneesWithProfiles).toEqual([asAssigneeWithProfile(userProfiles[0])]);
    expect(result.current.assigneesWithoutProfiles).toEqual([{ uid: '1' }]);
    expect(result.current.allAssignees).toEqual([
      asAssigneeWithProfile(userProfiles[0]),
      { uid: '1' },
    ]);
  });
});

const asAssigneeWithProfile = (profile: UserProfileWithAvatar) => ({ uid: profile.uid, profile });
