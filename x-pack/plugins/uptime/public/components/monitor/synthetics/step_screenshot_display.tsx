/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import React, { useContext, useEffect, useRef, useState, FC } from 'react';
import { useIntersection } from 'react-use';
import { UptimeThemeContext } from '../../../contexts';

interface ScreenshotDisplayProps {
  isLoading: boolean;
  screenshot: string;
  stepIndex: number;
  fetchScreenshot: (stepIndex: number) => void;
}

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;

export const StepScreenshotDisplay: FC<ScreenshotDisplayProps> = ({
  isLoading,
  screenshot,
  stepIndex,
  fetchScreenshot,
}) => {
  const containerRef = useRef(null);
  const {
    colors: { lightestShade: pageBackground },
  } = useContext(UptimeThemeContext);

  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState<boolean>(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState<boolean>(false);

  const intersection = useIntersection(containerRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  useEffect(() => {
    if (screenshot === undefined && intersection && intersection.isIntersecting) {
      fetchScreenshot(stepIndex);
    }
  }, [fetchScreenshot, intersection, screenshot, stepIndex]);

  let content: JSX.Element;
  if (screenshot) {
    const screenshotSrc = `data:image/jpeg;base64,${screenshot}`;
    content = (
      <>
        {isOverlayOpen && (
          <EuiOverlayMask onClick={() => setIsOverlayOpen(false)}>
            <input
              type="image"
              src={screenshotSrc}
              alt="full-size screenshot"
              style={{ objectFit: 'contain' }}
              onClick={() => setIsOverlayOpen(false)}
            />
          </EuiOverlayMask>
        )}
        <EuiPopover
          anchorPosition="rightCenter"
          button={
            <input
              type="image"
              style={{
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT,
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
              src={screenshotSrc}
              alt="stuff"
              onClick={() => setIsOverlayOpen(true)}
              onMouseEnter={() => setIsImagePopoverOpen(true)}
              onMouseLeave={() => setIsImagePopoverOpen(false)}
            />
          }
          closePopover={() => setIsImagePopoverOpen(false)}
          isOpen={isImagePopoverOpen}
        >
          <img
            alt="stuff"
            src={screenshotSrc}
            // TODO: extract these vals to a constant and @media
            style={{ width: 640, height: 360, objectFit: 'contain' }}
          />
        </EuiPopover>
      </>
    );
  } else if (isLoading === false && screenshot === '') {
    content = (
      <EuiFlexGroup alignItems="center" direction="column" style={{ paddingTop: '32px' }}>
        <EuiFlexItem grow={false}>
          <EuiIcon color="subdued" size="xxl" type="image" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong>No image available</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (isLoading) {
    content = <EuiLoadingSpinner size="xl" />;
  } else {
    content = null;
  }
  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: pageBackground, height: THUMBNAIL_HEIGHT, width: THUMBNAIL_WIDTH }}
    >
      {content}
    </div>
  );
};
