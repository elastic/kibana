/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage, EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { ScreenshotRefImageData } from '../../../../../../common/runtime_types/ping/synthetics';
import { fullSizeImageAlt } from './translations';
import { useCompositeImage } from '../../../../../hooks/use_composite_image';

const POPOVER_IMG_HEIGHT = 360;
const POPOVER_IMG_WIDTH = 640;

const StepImage = styled(EuiImage)`
  &&& {
    display: flex;
    figure.euiImage-isFullScreen {
      display: flex;
      div.stepArrowsFullScreen {
        display: flex;
      }
    }
  }
`;

interface ScreenshotImageProps {
  captionContent: string;
  imageCaption: JSX.Element;
}

const DefaultImage: React.FC<ScreenshotImageProps & { url?: string }> = ({
  captionContent,
  imageCaption,
  url,
}) =>
  url ? (
    <StepImage
      allowFullScreen={true}
      alt={captionContent}
      caption={imageCaption}
      data-test-subj="pingTimestampImage"
      hasShadow
      url={url}
      size="s"
      className="syntheticsStepImage"
    />
  ) : (
    <EuiLoadingSpinner size="l" />
  );

/**
 * This component provides an intermediate step for composite images. It causes a loading spinner to appear
 * while the image is being re-assembled, then calls the default image component and provides a data URL for the image.
 */
const RecomposedScreenshotImage: React.FC<
  ScreenshotImageProps & {
    imgRef: ScreenshotRefImageData;
    setUrl: React.Dispatch<string | undefined>;
    url?: string;
  }
> = (props) => {
  const { imgRef, setUrl, url } = props;

  // initially an undefined URL value is passed to the image display, and a loading spinner is rendered.
  // `useCompositeImage` will call `setUrl` when the image is composited, and the updated `url` will display.
  useCompositeImage(imgRef, setUrl, url);

  return <DefaultImage {...props} url={props.url} />;
};

export interface StepImagePopoverProps {
  captionContent: string;
  imageCaption: JSX.Element;
  imgSrc?: string;
  imgRef?: ScreenshotRefImageData;
  isImagePopoverOpen: boolean;
}

const StepImageComponent: React.FC<
  Omit<StepImagePopoverProps, 'isImagePopoverOpen'> & {
    setUrl: React.Dispatch<string | undefined>;
    url: string | undefined;
  }
> = (props) => {
  if (props.imgSrc) {
    props.setUrl(props.imgSrc);
    return <DefaultImage {...props} url={props.url} />;
  } else if (props.imgRef) {
    return <RecomposedScreenshotImage {...props} imgRef={props.imgRef} />;
  }
  return null;
};

export const StepImagePopover: React.FC<StepImagePopoverProps> = ({
  captionContent,
  imageCaption,
  imgRef,
  imgSrc,
  isImagePopoverOpen,
}) => {
  const [url, setUrl] = React.useState<string | undefined>(undefined);
  return (
    <EuiPopover
      anchorPosition="leftDown"
      button={
        <StepImageComponent
          captionContent={captionContent}
          imageCaption={imageCaption}
          imgRef={imgRef}
          imgSrc={imgSrc}
          setUrl={setUrl}
          url={url}
        />
      }
      isOpen={isImagePopoverOpen}
      closePopover={() => {}}
    >
      {url ? (
        <EuiImage
          alt={fullSizeImageAlt}
          url={url}
          style={{ height: POPOVER_IMG_HEIGHT, width: POPOVER_IMG_WIDTH, objectFit: 'contain' }}
        />
      ) : (
        <EuiLoadingSpinner size="l" />
      )}
    </EuiPopover>
  );
};
