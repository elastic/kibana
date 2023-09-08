/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StepScreenshotDisplay } from './step_screenshot_display';
import { render } from '../../lib/helper/rtl_helpers';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import '../../lib/__mocks__/legacy_use_composite_image.mock';
import { mockRef } from '../../lib/__mocks__/legacy_screenshot_ref.mock';

jest.mock('@kbn/observability-shared-plugin/public');

jest.mock('react-use/lib/useIntersection', () => () => ({
  isIntersecting: true,
}));

describe('StepScreenshotDisplayProps', () => {
  beforeAll(() => {
    jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      data: null,
      status: observabilitySharedPublic.FETCH_STATUS.SUCCESS,
      refetch: () => {},
    });
  });

  afterAll(() => {
    (observabilitySharedPublic.useFetcher as any).mockClear();
  });
  it('displays screenshot thumbnail when present', () => {
    const { getByAltText } = render(
      <StepScreenshotDisplay
        checkGroup="check_group"
        isFullScreenshot={true}
        isScreenshotRef={false}
        stepIndex={1}
        stepName="STEP_NAME"
      />
    );

    expect(getByAltText('Screenshot for step with name "STEP_NAME"')).toBeInTheDocument();
  });

  it('uses alternative text when step name not available', () => {
    const { getByAltText } = render(
      <StepScreenshotDisplay
        checkGroup="check_group"
        isFullScreenshot={true}
        isScreenshotRef={false}
        stepIndex={1}
      />
    );

    expect(getByAltText('Screenshot')).toBeInTheDocument();
  });

  it('displays No Image message when screenshot does not exist', () => {
    const { getByTestId } = render(
      <StepScreenshotDisplay
        checkGroup="check_group"
        isFullScreenshot={false}
        isScreenshotRef={false}
        stepIndex={1}
        stepName="STEP_NAME"
      />
    );
    expect(getByTestId('stepScreenshotImageUnavailable')).toBeInTheDocument();
  });

  it('displays screenshot thumbnail for ref', () => {
    jest.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      status: observabilitySharedPublic.FETCH_STATUS.SUCCESS,
      data: { ...mockRef },
      refetch: () => null,
    });

    const { getByAltText } = render(
      <StepScreenshotDisplay
        checkGroup="check_group"
        isFullScreenshot={false}
        isScreenshotRef={true}
        stepIndex={1}
        stepName="STEP_NAME"
      />
    );

    expect(getByAltText('Screenshot for step with name "STEP_NAME"')).toBeInTheDocument();
  });
});
