/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, MouseEvent } from 'react';
import { EuiPopover, useEuiTheme } from '@elastic/eui';

import { POPOVER_SCREENSHOT_SIZE, ScreenshotImageSize } from '../screenshot/screenshot_size';
import { JourneyScreenshotDialog } from '../screenshot/journey_screenshot_dialog';
import { ScreenshotImage } from '../screenshot/screenshot_image';

export interface StepImagePopoverProps {
  checkGroup: string | undefined;
  stepName?: string;
  stepNumber: number;
  imgSrc?: string;
  maxSteps: number | undefined;
  isStepFailed: boolean;
  isLoading: boolean;
  size: ScreenshotImageSize;
  unavailableMessage?: string;
  borderRadius?: string | number;
}

export const JourneyScreenshotPreview: React.FC<StepImagePopoverProps> = ({
  checkGroup,
  stepName,
  stepNumber,
  imgSrc,
  maxSteps,
  isStepFailed,
  isLoading,
  size,
  unavailableMessage,
  borderRadius,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  // Only render the dialog if the image is at least once clicked
  const [isImageEverClick, setIsImageEverClicked] = useState(false);

  const onMouseEnter = useCallback(
    (_evt: MouseEvent<HTMLImageElement>) => {
      setIsImagePopoverOpen(true);
    },
    [setIsImagePopoverOpen]
  );

  const onMouseLeave = useCallback(
    (_evt: MouseEvent<HTMLImageElement>) => {
      setIsImagePopoverOpen(false);
    },
    [setIsImagePopoverOpen]
  );

  const onImgClick = useCallback(
    (_evt: MouseEvent<HTMLImageElement>) => {
      setIsImageEverClicked(true);
      setIsImageDialogOpen(true);
      setIsImagePopoverOpen(false);
    },
    [setIsImagePopoverOpen]
  );

  const onDialogClose = useCallback(() => {
    setIsImageDialogOpen(false);
  }, [setIsImageDialogOpen]);

  const renderScreenshotImage = (screenshotSize: ScreenshotImageSize) => (
    <ScreenshotImage
      label={stepName}
      imgSrc={imgSrc}
      isLoading={isLoading}
      size={screenshotSize}
      unavailableMessage={unavailableMessage}
      borderColor={isStepFailed ? euiTheme.colors.danger : undefined}
      borderRadius={borderRadius}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onImgClick}
    />
  );

  return (
    <>
      {isImageEverClick ? (
        <JourneyScreenshotDialog
          checkGroup={checkGroup}
          initialImgSrc={imgSrc}
          initialStepNumber={stepNumber}
          maxSteps={maxSteps}
          isOpen={isImageDialogOpen}
          onClose={onDialogClose}
        />
      ) : null}
      <EuiPopover
        anchorPosition="leftDown"
        button={renderScreenshotImage(size)}
        isOpen={isImagePopoverOpen}
      >
        {renderScreenshotImage(POPOVER_SCREENSHOT_SIZE)}
      </EuiPopover>
    </>
  );
};
