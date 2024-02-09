/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { EditAssigneesSelectable } from './edit_assignees_selectable';
import { basicCase } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';
import { userProfiles, userProfilesMap } from '../../../containers/user_profiles/api.mock';
import * as api from '../../../containers/user_profiles/api';

jest.mock('../../../containers/user_profiles/api');

describe('EditAssigneesSelectable', () => {
  let appMock: AppMockRenderer;

  /**
   * Case has the following tags: Damaged Raccoon
   * All available tags are: Damaged Raccoon, Physical Dinosaur, Wet Dingo
   */
  const props = {
    selectedCases: [basicCase],
    isLoading: false,
    onChangeAssignees: jest.fn(),
  };

  /**
   * Case one has the following assignees: Damaged Raccoon
   * Case two has the following assignees: Damaged Raccoon, Physical Dinosaur
   * All available assignees are: Damaged Raccoon, Physical Dinosaur, Wet Dingo, Silly Hare, Convenient Orca
   */
  const propsMultipleCases = {
    selectedCases: [
      basicCase,
      { ...basicCase, assignees: [...basicCase.assignees, { uid: userProfiles[1].uid }] },
    ],
    isLoading: false,
    onChangeAssignees: jest.fn(),
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    expect(await screen.findByPlaceholderText('Find a user')).toBeInTheDocument();
    expect(await screen.findByText('Selected: 1')).toBeInTheDocument();

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      expect(await screen.findByText(userProfile.user.full_name)).toBeInTheDocument();
    }
  });

  it('renders the selected assignees label correctly', async () => {
    appMock.render(<EditAssigneesSelectable {...propsMultipleCases} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    expect(await screen.findByText('Selected: 2')).toBeInTheDocument();

    for (const userProfile of userProfilesMap.values()) {
      // @ts-ignore: full name exists
      expect(await screen.findByText(userProfile.user.full_name)).toBeInTheDocument();
    }
  });

  it('renders the assignees icons correctly', async () => {
    appMock.render(<EditAssigneesSelectable {...propsMultipleCases} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    for (const [uid, icon] of [
      [userProfiles[0].uid, 'check'],
      [userProfiles[1].uid, 'asterisk'],
      [userProfiles[2].uid, 'empty'],
    ]) {
      const iconDataTestSubj = `cases-actions-assignees-edit-selectable-assignee-${uid}-icon-${icon}`;
      expect(await screen.findByTestId(iconDataTestSubj)).toBeInTheDocument();
    }
  });

  it('selects and unselects correctly assignees with one case', async () => {
    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      userEvent.click(await screen.findByText(userProfile.user.full_name));
    }

    expect(props.onChangeAssignees).toBeCalledTimes(3);
    expect(props.onChangeAssignees).nthCalledWith(3, {
      selectedItems: [
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      ],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('selects and unselects correctly assignees with multiple cases', async () => {
    appMock.render(<EditAssigneesSelectable {...propsMultipleCases} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      userEvent.click(await screen.findByText(userProfile.user.full_name));
    }

    expect(propsMultipleCases.onChangeAssignees).toBeCalledTimes(3);
    expect(propsMultipleCases.onChangeAssignees).nthCalledWith(3, {
      selectedItems: [
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      ],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('renders the icons correctly after selecting and deselecting assignees', async () => {
    appMock.render(<EditAssigneesSelectable {...propsMultipleCases} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    for (const userProfile of userProfiles) {
      // @ts-ignore: full name exists
      userEvent.click(await screen.findByText(userProfile.user.full_name));
    }

    for (const [uid, icon] of [
      [userProfiles[0].uid, 'empty'],
      [userProfiles[1].uid, 'check'],
      [userProfiles[2].uid, 'check'],
    ]) {
      const iconDataTestSubj = `cases-actions-assignees-edit-selectable-assignee-${uid}-icon-${icon}`;
      expect(await screen.findByTestId(iconDataTestSubj)).toBeInTheDocument();
    }

    expect(propsMultipleCases.onChangeAssignees).toBeCalledTimes(3);
    expect(propsMultipleCases.onChangeAssignees).nthCalledWith(3, {
      selectedItems: [
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
      ],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('sort users alphabetically correctly', async () => {
    const spyOnBulkGetUserProfiles = jest.spyOn(api, 'bulkGetUserProfiles');
    const reversedUserProfiles = [...userProfiles].reverse();
    spyOnBulkGetUserProfiles.mockResolvedValueOnce(reversedUserProfiles);

    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    const allUsersInView = await screen.findAllByRole('option');
    expect(allUsersInView.length).toBe(3);

    expect(allUsersInView[0].textContent?.includes('Damaged Raccoon')).toBe(true);
    expect(allUsersInView[1].textContent?.includes('Physical Dinosaur')).toBe(true);
    expect(allUsersInView[2].textContent?.includes('Wet Dingo')).toBe(true);
  });

  it('search and sorts alphabetically', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    userEvent.type(await screen.findByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(await screen.findByTestId(searchedUserDataTestSubj));

    const searchResults = await screen.findAllByRole('option');

    expect(searchResults.length).toBe(2);
    expect(searchResults[0].textContent?.includes('Physical Dinosaur')).toBe(true);
    expect(searchResults[1].textContent?.includes('Silly Hare')).toBe(true);
  });

  it('selecting and deselecting a searched user does not show it after the user cleared the search', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    userEvent.type(await screen.findByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(await screen.findByTestId(searchedUserDataTestSubj));

    // selects
    userEvent.click(await screen.findByTestId(searchedUserDataTestSubj));
    // deselect
    userEvent.click(await screen.findByTestId(searchedUserDataTestSubj));
    // clear search results
    userEvent.click(await screen.findByTestId('clearSearchButton'));

    expect(await screen.findByText('Damaged Raccoon'));

    expect(screen.queryByTestId(searchedUserDataTestSubj)).not.toBeInTheDocument();
  });

  it('does not show the same user in search results if it is already in the initial user profile mapping', async () => {
    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    userEvent.type(await screen.findByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const searchResults = await screen.findAllByTestId(
      // Physical Dinosaur
      'cases-actions-assignees-edit-selectable-assignee-u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0-icon-empty'
    );

    expect(searchResults.length).toBe(1);
  });

  it('selects a searched user correctly', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    userEvent.type(await screen.findByPlaceholderText('Find a user'), 's');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(await screen.findByTestId(searchedUserDataTestSubj));

    userEvent.click(await screen.findByTestId(searchedUserDataTestSubj));
    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: [
        'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        'u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0',
      ],
      unSelectedItems: [],
    });
  });

  it('shows deselected users from the initial user profile mapping', async () => {
    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    // @ts-ignore: full name exists
    userEvent.click(await screen.findByText(userProfiles[0].user.full_name));

    // @ts-ignore: full name exists
    expect(await screen.findByText(userProfiles[0].user.full_name)).toBeInTheDocument();
    // ensures that the icon is set to empty
    expect(
      await screen.findByTestId(
        'cases-actions-assignees-edit-selectable-assignee-u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0-icon-empty'
      )
    ).toBeInTheDocument();

    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: [],
      unSelectedItems: ['u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0'],
    });
  });

  it('does not shows initial empty search results on the list of users', async () => {
    // Silly Hare
    const searchedUserDataTestSubj =
      'cases-actions-assignees-edit-selectable-assignee-u_IbBVXpDtrjOByJ-syBdr425fLGqwpzY_xdQqCFAFXLI_0';

    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(await screen.findByText('Damaged Raccoon'));

    expect(screen.queryByTestId(searchedUserDataTestSubj)).not.toBeInTheDocument();
  });

  it('shows the no matching component', async () => {
    appMock.render(<EditAssigneesSelectable {...props} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    userEvent.type(await screen.findByPlaceholderText('Find a user'), 'not-exists');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(
      (await screen.findAllByTestId('case-user-profiles-assignees-popover-no-matches'))[0]
    ).toBeInTheDocument();
  });

  it('shows unknown users', async () => {
    const selectedCases = [{ ...basicCase, assignees: [{ uid: '123' }, { uid: '456' }] }];
    appMock.render(<EditAssigneesSelectable {...props} selectedCases={selectedCases} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    const unknownUsers = await screen.findAllByText('Unknown');
    expect(unknownUsers.length).toBe(2);
  });

  it('selects unknown users', async () => {
    const selectedCases = [{ ...basicCase, assignees: [{ uid: '123' }] }, basicCase];
    appMock.render(<EditAssigneesSelectable {...props} selectedCases={selectedCases} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    expect(await screen.findByText('Unknown')).toBeInTheDocument();

    userEvent.click(await screen.findByText('Unknown'));

    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: ['123'],
      unSelectedItems: [],
    });
  });

  it('deselects unknown users', async () => {
    const selectedCases = [{ ...basicCase, assignees: [{ uid: '123' }] }];
    appMock.render(<EditAssigneesSelectable {...props} selectedCases={selectedCases} />);

    expect(await screen.findByText('Unknown')).toBeInTheDocument();

    userEvent.click(await screen.findByText('Unknown'));

    expect(props.onChangeAssignees).toBeCalledWith({
      selectedItems: [],
      unSelectedItems: ['123'],
    });
  });

  it('remove all assignees', async () => {
    appMock.render(<EditAssigneesSelectable {...propsMultipleCases} />);

    expect(
      await screen.findByTestId('cases-actions-assignees-edit-selectable')
    ).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: 'Remove all assignees' })).toBeInTheDocument();
    userEvent.click(await screen.findByRole('button', { name: 'Remove all assignees' }));

    expect(propsMultipleCases.onChangeAssignees).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeAssignees).toBeCalledWith({
      selectedItems: [],
      unSelectedItems: [
        'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
      ],
    });
  });
});
