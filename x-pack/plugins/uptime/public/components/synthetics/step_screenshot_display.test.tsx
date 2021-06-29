/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StepScreenshotDisplay } from './step_screenshot_display';
import { render } from '../../lib/helper/rtl_helpers';
import * as observabilityPublic from '../../../../observability/public';
import '../../lib/__mocks__/use_composite_image.mock';
import { mockRef } from '../../lib/__mocks__/screenshot_ref.mock';

jest.mock('../../../../observability/public', () => {
  const originalModule = jest.requireActual('../../../../observability/public');

  return {
    ...originalModule,
    useFetcher: jest.fn().mockReturnValue({ data: null, status: 'success' }),
  };
});

jest.mock('react-use/lib/useIntersection', () => () => ({
  isIntersecting: true,
}));

describe('StepScreenshotDisplayProps', () => {
  it('displays screenshot thumbnail when present', () => {
    const { getByAltText } = render(
      <StepScreenshotDisplay
        checkGroup="check_group"
        isScreenshotBlob={true}
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
        isScreenshotBlob={true}
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
        isScreenshotBlob={false}
        isScreenshotRef={false}
        stepIndex={1}
        stepName="STEP_NAME"
      />
    );
    expect(getByTestId('stepScreenshotImageUnavailable')).toBeInTheDocument();
  });

  it('displays screenshot thumbnail for ref', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: observabilityPublic.FETCH_STATUS.SUCCESS,
      data: { ...mockRef },
      refetch: () => null,
    });

    const { getByAltText } = render(
      <StepScreenshotDisplay
        checkGroup="check_group"
        isScreenshotBlob={false}
        isScreenshotRef={true}
        stepIndex={1}
        stepName="STEP_NAME"
      />
    );

    expect(getByAltText('Screenshot for step with name "STEP_NAME"')).toBeInTheDocument();
  });
});
