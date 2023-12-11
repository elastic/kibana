/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TimelineTour } from '.';
import { TIMELINE_TOUR_CONFIG_ANCHORS } from './step_config';
import { useIsElementMounted } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { TimelineTabs } from '../../../../../common/types';

jest.mock(
  '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted'
);

const switchTabMock = jest.fn();

const TestComponent = () => {
  return (
    <TestProviders>
      <TimelineTour activeTab={TimelineTabs.query} switchToTab={switchTabMock} />
      {Object.values(TIMELINE_TOUR_CONFIG_ANCHORS).map((anchor) => {
        return <div id={anchor} key={anchor} />;
      })}
    </TestProviders>
  );
};

describe('Timeline Tour', () => {
  beforeAll(() => {
    (useIsElementMounted as jest.Mock).mockReturnValue(true);
  });

  it('should not render tour steps when element are not mounted', () => {
    (useIsElementMounted as jest.Mock).mockReturnValueOnce(false);
    render(<TestComponent />);
    expect(screen.queryByTestId('timeline-tour-step-1')).toBeNull();
  });

  it('should  render tour steps when element are  mounted', async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('timeline-tour-step-1')).toBeVisible();
    });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByTestId('timeline-tour-step-2')).toBeVisible();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByTestId('timeline-tour-step-3')).toBeVisible();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByTestId('timeline-tour-step-4')).toBeVisible();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.queryByText('Finish tour')).toBeVisible();
    });
  });
});
