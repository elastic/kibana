/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MissingJobsAlert } from './anomaly_detection_setup_link';
import * as hooks from '../../hooks/useFetcher';

async function renderTooltipAnchor({
  jobs,
  environment,
}: {
  jobs: Array<{ job_id: string; environment: string }>;
  environment?: string;
}) {
  // mock api response
  jest.spyOn(hooks, 'useFetcher').mockReturnValue({
    data: { jobs },
    status: hooks.FETCH_STATUS.SUCCESS,
    refetch: jest.fn(),
  });

  const { baseElement, container } = render(
    <MissingJobsAlert environment={environment} />
  );

  // hover tooltip anchor if it exists
  const toolTipAnchor = container.querySelector('.euiToolTipAnchor') as any;
  if (toolTipAnchor) {
    fireEvent.mouseOver(toolTipAnchor);

    // wait for tooltip text to be in the DOM
    await waitFor(() => {
      const toolTipText = baseElement.querySelector('.euiToolTipPopover')
        ?.textContent;
      expect(toolTipText).not.toBe(undefined);
    });
  }

  const toolTipText = baseElement.querySelector('.euiToolTipPopover')
    ?.textContent;

  return { toolTipText, toolTipAnchor };
}

describe('MissingJobsAlert', () => {
  describe('when no jobs exist', () => {
    it('shows a warning', async () => {
      const { toolTipText, toolTipAnchor } = await renderTooltipAnchor({
        jobs: [],
      });

      expect(toolTipAnchor).toBeInTheDocument();
      expect(toolTipText).toBe(
        'Anomaly detection is not yet enabled. Click to continue setup.'
      );
    });
  });

  describe('when no jobs exists for the selected environment', () => {
    it('shows a warning', async () => {
      const { toolTipAnchor, toolTipText } = await renderTooltipAnchor({
        jobs: [{ environment: 'production', job_id: 'my_job_id' }],
        environment: 'staging',
      });

      expect(toolTipAnchor).toBeInTheDocument();
      expect(toolTipText).toBe(
        'Anomaly detection is not yet enabled for the environment "staging". Click to continue setup.'
      );
    });
  });

  describe('when a job exists for the selected environment', () => {
    it('does not show a warning', async () => {
      const { toolTipAnchor, toolTipText } = await renderTooltipAnchor({
        jobs: [{ environment: 'production', job_id: 'my_job_id' }],
        environment: 'production',
      });

      expect(toolTipAnchor).not.toBeInTheDocument();
      expect(toolTipText).toBe(undefined);
    });
  });

  describe('when at least one job exists and no environment is selected', () => {
    it('does not show a warning', async () => {
      const { toolTipAnchor, toolTipText } = await renderTooltipAnchor({
        jobs: [{ environment: 'production', job_id: 'my_job_id' }],
      });

      expect(toolTipAnchor).not.toBeInTheDocument();
      expect(toolTipText).toBe(undefined);
    });
  });

  describe('when at least one job exists and all environments are selected', () => {
    it('does not show a warning', async () => {
      const { toolTipAnchor, toolTipText } = await renderTooltipAnchor({
        jobs: [{ environment: 'ENVIRONMENT_ALL', job_id: 'my_job_id' }],
      });

      expect(toolTipAnchor).not.toBeInTheDocument();
      expect(toolTipText).toBe(undefined);
    });
  });
});
