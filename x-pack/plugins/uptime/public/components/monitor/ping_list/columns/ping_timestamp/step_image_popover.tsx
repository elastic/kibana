/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiImage, EuiPopover } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { fullSizeImageAlt } from './translations';

const POPOVER_IMG_HEIGHT = 360;
const POPOVER_IMG_WIDTH = 640;

const StepImage = styled(EuiImage)`
  &&& {
    display: flex;
    figcaption {
      white-space: nowrap;
      align-self: center;
      margin-left: 8px;
      margin-top: 8px;
      text-decoration: none !important;
    }
  }
`;
export interface StepImagePopoverProps {
  captionContent: string;
  imageCaption: JSX.Element;
  imgSrc: string;
  isImagePopoverOpen: boolean;
}

export const StepImagePopover: React.FC<StepImagePopoverProps> = ({
  captionContent,
  imageCaption,
  imgSrc,
  isImagePopoverOpen,
}) => (
  <EuiPopover
    anchorPosition="rightCenter"
    button={
      <StepImage
        allowFullScreen={true}
        alt={captionContent}
        caption={imageCaption}
        data-test-subj="pingTimestampImage"
        hasShadow
        url={imgSrc}
        size="s"
      />
    }
    isOpen={isImagePopoverOpen}
  >
    <EuiImage
      alt={fullSizeImageAlt}
      url={imgSrc}
      style={{ height: POPOVER_IMG_HEIGHT, width: POPOVER_IMG_WIDTH, objectFit: 'contain' }}
    />
  </EuiPopover>
);
