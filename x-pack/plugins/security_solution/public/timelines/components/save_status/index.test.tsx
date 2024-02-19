/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimelineSaveStatus } from '.';
import { TimelineStatus } from '../../../../common/api/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TimelineId } from '../../../../common/types';

jest.mock('../../../common/hooks/use_selector');

const renderTimelineSaveStatus = () => {
  return render(
    <IntlProvider locale="en">
      <TimelineSaveStatus timelineId={TimelineId.test} />
    </IntlProvider>
  );
};

describe('TimelineSaveStatus', () => {
  it('should render unsaved status if draft timeline', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      status: TimelineStatus.draft,
    });

    const { getByTestId, getByText } = renderTimelineSaveStatus();

    expect(getByTestId('timeline-save-status')).toBeInTheDocument();
    expect(getByText('Unsaved')).toBeVisible();
  });

  it('should render unsaved status if timeline has been updated', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      updated: undefined,
    });

    const { getByTestId, getByText } = renderTimelineSaveStatus();

    expect(getByTestId('timeline-save-status')).toBeInTheDocument();
    expect(getByText('Unsaved')).toBeVisible();
  });

  it('should render the unsaved changes status if timeline has changed', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      changed: true,
      updated: Date.now(),
    });

    const { getByTestId, getByText } = renderTimelineSaveStatus();

    expect(getByTestId('timeline-save-status')).toBeInTheDocument();
    expect(getByText('Unsaved changes')).toBeVisible();
  });

  it('should not render any status', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      changed: false,
      status: TimelineStatus.active,
      updated: Date.now(),
    });

    const { container } = renderTimelineSaveStatus();

    expect(container).toBeEmptyDOMElement();
  });
});
