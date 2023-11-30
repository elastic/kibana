/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimelineStatusInfo } from '.';
import { TimelineStatus } from '../../../../common/api/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TimelineId } from '../../../../common/types';

jest.mock('../../../common/hooks/use_selector');

const renderTimelineStatusInfo = () => {
  return render(
    <IntlProvider locale="en">
      <TimelineStatusInfo timelineId={TimelineId.test} />
    </IntlProvider>
  );
};

describe('TimelineStatusInfo', () => {
  it('should render the status correctly when timeline is unsaved', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      status: TimelineStatus.draft,
    });

    const { getByText } = renderTimelineStatusInfo();

    expect(getByText('Unsaved')).toBeVisible();
  });

  it('should render the status correctly when timeline has unsaved changes', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      changed: true,
      status: TimelineStatus.active,
      updated: Date.now(),
    });

    const { getByText } = renderTimelineStatusInfo();

    expect(getByText('Has unsaved changes')).toBeVisible();
  });

  it('should render the status correctly when timeline is saved', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      status: TimelineStatus.active,
      updated: Date.now(),
    });

    const { getByText } = renderTimelineStatusInfo();

    expect(getByText('Saved')).toBeVisible();
  });

  it('should render the status correctly when timeline is saved some time ago', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      status: TimelineStatus.active,
      updated: Date.now() - 10000,
    });

    const { getByTestId } = renderTimelineStatusInfo();

    expect(getByTestId('timeline-status')).toHaveTextContent(/Saved10 seconds ago/);
  });
});
