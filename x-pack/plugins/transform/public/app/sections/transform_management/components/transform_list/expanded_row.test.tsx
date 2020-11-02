/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import moment from 'moment-timezone';
import { TransformListRow } from '../../../../common';
import { ExpandedRow } from './expanded_row';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';
import { within } from '@testing-library/dom';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

import { MlSharedContext } from '../../../../../app/__mocks__/shared_context';
import { getMlSharedImports } from '../../../../../shared_imports';

describe('Transform: Transform List <ExpandedRow />', () => {
  // Set timezone to US/Eastern for consistent test results.
  beforeEach(() => {
    moment.tz.setDefault('US/Eastern');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('Minimal initialization', async () => {
    const mlShared = await getMlSharedImports();
    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = transformListRow;

    const { getByText, getByTestId } = render(
      <MlSharedContext.Provider value={mlShared}>
        <ExpandedRow item={item} />
      </MlSharedContext.Provider>
    );

    expect(getByText('Details')).toBeInTheDocument();
    expect(getByText('Stats')).toBeInTheDocument();
    expect(getByText('JSON')).toBeInTheDocument();
    expect(getByText('Messages')).toBeInTheDocument();
    expect(getByText('Preview')).toBeInTheDocument();

    const tabContent = getByTestId('transformDetailsTabContent');
    expect(tabContent).toBeInTheDocument();

    expect(getByTestId('transformDetailsTab')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabContent).getByText('General')).toBeInTheDocument();

    fireEvent.click(getByTestId('transformStatsTab'));
    expect(getByTestId('transformStatsTab')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabContent).getByText('Stats')).toBeInTheDocument();
  });
});
