/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    figure.euiImage-isFullScreen {
      display: flex;
      div.stepArrowsFullScreen {
        display: flex;
      }
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
    anchorPosition="leftDown"
    button={
      <StepImage
        allowFullScreen={true}
        alt={captionContent}
        caption={imageCaption}
        data-test-subj="pingTimestampImage"
        hasShadow
        url={imgSrc}
        size="s"
        className="syntheticsStepImage"
      />
    }
    isOpen={isImagePopoverOpen}
    closePopover={() => {}}
  >
    <EuiImage
      alt={fullSizeImageAlt}
      url={imgSrc}
      style={{ height: POPOVER_IMG_HEIGHT, width: POPOVER_IMG_WIDTH, objectFit: 'contain' }}
    />
  </EuiPopover>
);
