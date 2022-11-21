/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import type { AssigneesColumnProps } from './assignees_column';
import { AssigneesColumn } from './assignees_column';

describe('AssigneesColumn', () => {
  const defaultProps: AssigneesColumnProps = {
    assignees: userProfiles,
    userProfiles: userProfilesMap,
    compressedDisplayLimit: 2,
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();

    appMockRender = createAppMockRenderer();
  });

  it('renders a long dash if the assignees is an empty array', async () => {
    const props = {
      ...defaultProps,
      assignees: [],
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(
      screen.queryByTestId('case-table-column-assignee-damaged_raccoon')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-table-column-expand-button')).not.toBeInTheDocument();
    // u2014 is the unicode for a long dash
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('only renders 2 avatars when the limit is 2', async () => {
    const props = {
      ...defaultProps,
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(screen.getByTestId('case-table-column-assignee-damaged_raccoon')).toBeInTheDocument();
    expect(screen.getByTestId('case-table-column-assignee-physical_dinosaur')).toBeInTheDocument();
  });

  it('renders all 3 avatars when the limit is 5', async () => {
    const props = {
      ...defaultProps,
      compressedDisplayLimit: 5,
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(screen.getByTestId('case-table-column-assignee-damaged_raccoon')).toBeInTheDocument();
    expect(screen.getByTestId('case-table-column-assignee-physical_dinosaur')).toBeInTheDocument();
    expect(screen.getByTestId('case-table-column-assignee-wet_dingo')).toBeInTheDocument();
  });

  it('shows the show more avatars button when the limit is 2', async () => {
    const props = {
      ...defaultProps,
      compressedDisplayLimit: 2,
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(screen.getByTestId('case-table-column-expand-button')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('does not show the show more button when the limit is 5', async () => {
    const props = {
      ...defaultProps,
      compressedDisplayLimit: 5,
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(screen.queryByTestId('case-table-column-expand-button')).not.toBeInTheDocument();
  });

  it('does not show the show more button when the limit is the same number of the assignees', async () => {
    const props = {
      ...defaultProps,
      compressedDisplayLimit: userProfiles.length,
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(screen.queryByTestId('case-table-column-expand-button')).not.toBeInTheDocument();
  });

  it('displays the show less avatars button when the show more is clicked', async () => {
    const props = {
      ...defaultProps,
      compressedDisplayLimit: 2,
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(screen.queryByTestId('case-table-column-assignee-wet_dingo')).not.toBeInTheDocument();

    expect(screen.getByTestId('case-table-column-expand-button')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();

    userEvent.click(screen.getByTestId('case-table-column-expand-button'));

    await waitFor(() => {
      expect(screen.getByText('show less')).toBeInTheDocument();
      expect(screen.getByTestId('case-table-column-assignee-wet_dingo')).toBeInTheDocument();
    });
  });

  it('shows more avatars and then hides them when the expand row button is clicked multiple times', async () => {
    const props = {
      ...defaultProps,
      compressedDisplayLimit: 2,
    };

    appMockRender.render(<AssigneesColumn {...props} />);

    expect(screen.queryByTestId('case-table-column-assignee-wet_dingo')).not.toBeInTheDocument();

    expect(screen.getByTestId('case-table-column-expand-button')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();

    userEvent.click(screen.getByTestId('case-table-column-expand-button'));

    await waitFor(() => {
      expect(screen.getByText('show less')).toBeInTheDocument();
      expect(screen.getByTestId('case-table-column-assignee-wet_dingo')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('case-table-column-expand-button'));

    await waitFor(() => {
      expect(screen.getByText('+1 more')).toBeInTheDocument();
      expect(screen.queryByTestId('case-table-column-assignee-wet_dingo')).not.toBeInTheDocument();
    });
  });
});
