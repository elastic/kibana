/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiImage, EuiPopover, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useRouteMatch } from 'react-router-dom';
import { EmptyImage } from '../screenshot/empty_image';
import { ScreenshotRefImageData } from '../../../../../../common/runtime_types';
import { useCompositeImage } from '../../../hooks/use_composite_image';

import { EmptyThumbnail, thumbnailStyle } from './empty_thumbnail';
import { STEP_DETAIL_ROUTE } from '../../../../../../common/constants';

const POPOVER_IMG_HEIGHT = 360;
const POPOVER_IMG_WIDTH = 640;

interface ScreenshotImageProps {
  captionContent: string;
  imageCaption: JSX.Element;
  isStepFailed: boolean;
  isLoading: boolean;
  asThumbnail?: boolean;
}

const ScreenshotThumbnail: React.FC<ScreenshotImageProps & { imageData?: string }> = ({
  captionContent,
  imageCaption,
  imageData,
  isStepFailed,
  isLoading,
  asThumbnail = true,
}) => {
  return imageData ? (
    <EuiImage
      allowFullScreen={true}
      alt={captionContent}
      caption={imageCaption}
      data-test-subj="stepScreenshotThumbnail"
      hasShadow
      url={imageData}
      size="l"
      className="syntheticsStepImage"
    />
  ) : asThumbnail ? (
    <EmptyThumbnail isLoading={isLoading} />
  ) : (
    <EmptyImage isLoading={isLoading} />
  );
};
/**
 * This component provides an intermediate step for composite images. It causes a loading spinner to appear
 * while the image is being re-assembled, then calls the default image component and provides a data URL for the image.
 */
const RecomposedScreenshotImage: React.FC<
  ScreenshotImageProps & {
    imgRef: ScreenshotRefImageData;
    setImageData: React.Dispatch<string | undefined>;
    imageData: string | undefined;
  }
> = ({
  captionContent,
  imageCaption,
  imageData,
  imgRef,
  setImageData,
  isStepFailed,
  isLoading,
}) => {
  // initially an undefined URL value is passed to the image display, and a loading spinner is rendered.
  // `useCompositeImage` will call `setImageData` when the image is composited, and the updated `imageData` will display.
  useCompositeImage(imgRef, setImageData, imageData);

  return (
    <ScreenshotThumbnail
      captionContent={captionContent}
      imageCaption={imageCaption}
      imageData={imageData}
      isStepFailed={isStepFailed}
      isLoading={isLoading}
    />
  );
};

export interface StepImagePopoverProps {
  captionContent: string;
  imageCaption: JSX.Element;
  imgSrc?: string;
  imgRef?: ScreenshotRefImageData;
  isImagePopoverOpen: boolean;
  isStepFailed: boolean;
  isLoading: boolean;
  asThumbnail?: boolean;
}

const JourneyStepImage: React.FC<
  Omit<StepImagePopoverProps, 'isImagePopoverOpen'> & {
    setImageData: React.Dispatch<string | undefined>;
    imageData: string | undefined;
  }
> = ({
  captionContent,
  imageCaption,
  imageData,
  imgRef,
  imgSrc,
  setImageData,
  isStepFailed,
  isLoading,
  asThumbnail = true,
}) => {
  if (imgSrc) {
    return (
      <ScreenshotThumbnail
        captionContent={captionContent}
        imageCaption={imageCaption}
        imageData={imageData}
        isStepFailed={isStepFailed}
        isLoading={isLoading}
        asThumbnail={asThumbnail}
      />
    );
  } else if (imgRef) {
    return (
      <RecomposedScreenshotImage
        captionContent={captionContent}
        imageCaption={imageCaption}
        imageData={imageData}
        imgRef={imgRef}
        setImageData={setImageData}
        isStepFailed={isStepFailed}
        isLoading={isLoading}
      />
    );
  }
  return null;
};

export const JourneyStepImagePopover: React.FC<StepImagePopoverProps> = ({
  captionContent,
  imageCaption,
  imgRef,
  imgSrc,
  isImagePopoverOpen,
  isStepFailed,
  isLoading,
  asThumbnail = true,
}) => {
  const { euiTheme } = useEuiTheme();

  const [imageData, setImageData] = React.useState<string | undefined>(imgSrc || undefined);

  React.useEffect(() => {
    // for legacy screenshots, when a new image arrives, we must overwrite it
    if (imgSrc && imgSrc !== imageData) {
      setImageData(imgSrc);
    }
  }, [imgSrc, imageData]);

  const setImageDataCallback = React.useCallback(
    (newImageData: string | undefined) => setImageData(newImageData),
    [setImageData]
  );

  const isImageLoading = isLoading || (!!imgRef && !imageData);

  const isStepDetailPage = useRouteMatch(STEP_DETAIL_ROUTE)?.isExact;

  const thumbnailS = isStepDetailPage ? null : thumbnailStyle;

  return (
    <EuiPopover
      css={css`
        figure {
          img {
            ${thumbnailS};
            border: ${euiTheme.border.thin};
            ${isStepFailed ? `border-color: ${euiTheme.colors.danger}` : ``};
          }
        }
      `}
      anchorPosition="leftDown"
      button={
        <JourneyStepImage
          captionContent={captionContent}
          imageCaption={imageCaption}
          imgRef={imgRef}
          imgSrc={imgSrc}
          setImageData={setImageDataCallback}
          imageData={imageData}
          isStepFailed={isStepFailed}
          isLoading={isImageLoading}
          asThumbnail={asThumbnail}
        />
      }
      isOpen={isImagePopoverOpen}
      closePopover={() => {}}
    >
      {imageData && !isLoading ? (
        <EuiImage
          alt={fullSizeImageAlt}
          url={imageData}
          css={css`
            width: ${POPOVER_IMG_WIDTH}px;
            height: ${POPOVER_IMG_HEIGHT}px;
            object-fit: contain;
          `}
        />
      ) : asThumbnail ? (
        <EmptyThumbnail isLoading={isLoading} />
      ) : (
        <EmptyImage isLoading={isLoading} />
      )}
    </EuiPopover>
  );
};

export const fullSizeImageAlt = i18n.translate('xpack.synthetics.monitor.step.thumbnail.alt', {
  defaultMessage: `A larger version of the screenshot for this journey step's thumbnail.`,
});
