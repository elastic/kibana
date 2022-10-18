/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import useIntersection from 'react-use/lib/useIntersection';
import { i18n } from '@kbn/i18n';

import { EmptyImage } from './empty_image';
import {
  isScreenshotImageBlob,
  isScreenshotRef,
  ScreenshotRefImageData,
} from '../../../../../../common/runtime_types';

import { SyntheticsSettingsContext } from '../../../contexts';

import { useRetrieveStepImage } from '../monitor_test_result/use_retrieve_step_image';
import { ScreenshotOverlayFooter } from '../monitor_test_result/screenshot_overlay_footer';
import { JourneyStepImagePopover } from '../monitor_test_result/journey_step_image_popover';
import { EmptyThumbnail } from '../monitor_test_result/empty_thumbnail';

interface Props {
  checkGroup?: string;
  stepLabels?: string[];
  stepStatus?: string;
  initialStepNo?: number;
  allStepsLoaded?: boolean;
  asThumbnail?: boolean;
  retryFetchOnRevisit?: boolean; // Set to `true` fro "Run Once" / "Test Now" modes
}

export const JourneyStepScreenshotContainer = ({
  stepLabels = [],
  checkGroup,
  stepStatus,
  allStepsLoaded,
  initialStepNo = 1,
  retryFetchOnRevisit = false,
  asThumbnail = true,
}: Props) => {
  const [stepNumber, setStepNumber] = useState(initialStepNo);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);

  const [stepImages, setStepImages] = useState<string[]>([]);

  const intersectionRef = React.useRef(null);

  const { basePath } = useContext(SyntheticsSettingsContext);

  const imgPath = `${basePath}/internal/uptime/journey/screenshot/${checkGroup}/${stepNumber}`;
  const stepLabel = stepLabels[stepNumber - 1] ?? '';

  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  const [screenshotRef, setScreenshotRef] = useState<ScreenshotRefImageData | undefined>(undefined);

  const isScreenshotRefValid = Boolean(
    screenshotRef && screenshotRef?.ref?.screenshotRef?.synthetics?.step?.index === stepNumber
  );
  const { data, loading } = useRetrieveStepImage({
    hasImage: Boolean(stepImages[stepNumber - 1]) || isScreenshotRefValid,
    hasIntersected: Boolean(intersection && intersection.intersectionRatio === 1),
    stepStatus,
    imgPath,
    retryFetchOnRevisit,
  });

  useEffect(() => {
    if (isScreenshotRef(data)) {
      setScreenshotRef(data);
    } else if (isScreenshotImageBlob(data)) {
      setStepImages((prevState) => [...prevState, data?.src]);
    }
  }, [data]);

  let imgSrc;
  if (isScreenshotImageBlob(data)) {
    imgSrc = stepImages?.[stepNumber - 1] ?? data.src;
  }

  const captionContent = formatCaptionContent(stepNumber, data?.maxSteps);

  const [numberOfCaptions, setNumberOfCaptions] = useState(0);

  // Overlay Footer has next and previous buttons to traverse journey's steps
  const overlayFooter = (
    <ScreenshotOverlayFooter
      captionContent={captionContent}
      imgSrc={imgSrc}
      imgRef={screenshotRef}
      maxSteps={data?.maxSteps}
      setStepNumber={setStepNumber}
      stepNumber={stepNumber}
      isLoading={Boolean(loading)}
      label={stepLabel}
      onVisible={(val) => setNumberOfCaptions((prevVal) => (val ? prevVal + 1 : prevVal - 1))}
    />
  );

  useEffect(() => {
    // This is a hack to get state if image is in full screen, we should refactor
    // it once eui image exposes it's full screen state
    // we are checking if number of captions are 2, that means
    // image is in full screen mode since caption is also rendered on
    // full screen image
    // we dont want to change image displayed in thumbnail
    if (numberOfCaptions === 1 && stepNumber !== initialStepNo) {
      setStepNumber(initialStepNo);
    }
  }, [numberOfCaptions, initialStepNo, stepNumber]);

  return (
    <div
      css={css`
        figcaption {
          display: none; // Do not show the OverlayFooter under thumbnails
        }
      `}
      onMouseEnter={() => setIsImagePopoverOpen(true)}
      onMouseLeave={() => setIsImagePopoverOpen(false)}
      ref={intersectionRef}
    >
      {imgSrc || screenshotRef ? (
        <JourneyStepImagePopover
          captionContent={captionContent}
          imageCaption={overlayFooter}
          imgSrc={imgSrc}
          imgRef={screenshotRef}
          isImagePopoverOpen={isImagePopoverOpen}
          isStepFailed={stepStatus === 'failed'}
          isLoading={Boolean(loading)}
          asThumbnail={asThumbnail}
        />
      ) : asThumbnail ? (
        <EmptyThumbnail isLoading={loading || !allStepsLoaded} />
      ) : (
        <EmptyImage isLoading={loading || !allStepsLoaded} />
      )}
    </div>
  );
};

export const formatCaptionContent = (stepNumber: number, totalSteps?: number) =>
  i18n.translate('xpack.synthetics.monitor.stepOfSteps', {
    defaultMessage: 'Step: {stepNumber} of {totalSteps}',
    values: {
      stepNumber,
      totalSteps,
    },
  });
