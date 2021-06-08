/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage, EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { composeScreenshotRef } from '../../../../../lib/helper/compose_screenshot_images';
import { ScreenshotRefImageData } from '../../../../../../common/runtime_types';
import { fullSizeImageAlt } from './translations';

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
    <EuiLoadingSpinner />
  );

const RecomposedScreenshotImage: React.FC<
  ScreenshotImageProps & {
    imgRef: ScreenshotRefImageData;
    setUrl: React.Dispatch<string | undefined>;
    url?: string;
  }
> = (props) => {
  const { imgRef, setUrl } = props;
  React.useEffect(() => {
    const canvas = document.createElement('canvas');
    composeScreenshotRef(imgRef, canvas).then(() => {
      const imgData = canvas.toDataURL('image/jpg', 1.0);
      setUrl(imgData);
    });
  }, [imgRef, setUrl]);
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
        <EuiLoadingSpinner />
      )}
    </EuiPopover>
  );
};
