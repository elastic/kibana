/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import type { TimelineStatusInfoProps } from './timeline_status_info';
import { TimelineStatusInfo } from './timeline_status_info';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const TestComponent = (props: TimelineStatusInfoProps) => {
  return (
    <IntlProvider locale="en">
      <TimelineStatusInfo {...props} />
    </IntlProvider>
  );
};

describe('TestComponent', () => {
  it('should render the status correctly when timeline is unsaved', () => {
    render(<TestComponent status={TimelineStatus.draft} />);
    expect(screen.getByText('Unsaved')).toBeVisible();
  });

  it('should render the status correctly when timeline has unsaved changes', () => {
    render(<TestComponent status={TimelineStatus.active} changed={true} updated={Date.now()} />);
    expect(screen.getByText('Unsaved changes')).toBeVisible();
  });
});
