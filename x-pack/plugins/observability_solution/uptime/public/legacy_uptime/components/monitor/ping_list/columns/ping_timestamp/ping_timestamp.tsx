/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import useIntersection from 'react-use/lib/useIntersection';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { useInProgressImage } from './use_in_progress_image';
import {
  isScreenshotImageBlob,
  isScreenshotRef,
  ScreenshotRefImageData,
} from '../../../../../../../common/runtime_types';
import { UptimeSettingsContext } from '../../../../../contexts';

import { NoImageDisplay } from './no_image_display';
import { StepImageCaption } from './step_image_caption';
import { StepImagePopover } from './step_image_popover';
import { formatCaptionContent } from './translations';

const StepDiv = euiStyled.div`
  figcaption {
    display: none;
  }
`;

interface Props {
  checkGroup?: string;
  label?: string;
  stepStatus?: string;
  initialStepNo?: number;
  allStepsLoaded?: boolean;
}

export const PingTimestamp = ({
  label,
  checkGroup,
  stepStatus,
  allStepsLoaded = true,
  initialStepNo = 1,
}: Props) => {
  const [stepNumber, setStepNumber] = useState(initialStepNo);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);

  const [stepImages, setStepImages] = useState<string[]>([]);

  const intersectionRef = React.useRef(null);

  const { basePath } = useContext(UptimeSettingsContext);

  const imgPath = `${basePath}/internal/uptime/journey/screenshot/${checkGroup}/${stepNumber}`;

  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  const [screenshotRef, setScreenshotRef] = useState<ScreenshotRefImageData | undefined>(undefined);

  const isScreenshotRefValid = Boolean(
    screenshotRef && screenshotRef?.ref?.screenshotRef?.synthetics?.step?.index === stepNumber
  );
  const { data, loading } = useInProgressImage({
    hasImage: Boolean(stepImages[stepNumber - 1]) || isScreenshotRefValid,
    hasIntersected: Boolean(intersection && intersection.intersectionRatio === 1),
    stepStatus,
    imgPath,
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

  const ImageCaption = (
    <StepImageCaption
      captionContent={captionContent}
      imgSrc={imgSrc}
      imgRef={screenshotRef}
      maxSteps={data?.maxSteps}
      setStepNumber={setStepNumber}
      stepNumber={stepNumber}
      isLoading={Boolean(loading)}
      label={label}
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
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <StepDiv
          onMouseEnter={() => setIsImagePopoverOpen(true)}
          onMouseLeave={() => setIsImagePopoverOpen(false)}
          ref={intersectionRef}
        >
          {(imgSrc || screenshotRef) && (
            <StepImagePopover
              captionContent={captionContent}
              imageCaption={ImageCaption}
              imgSrc={imgSrc}
              imgRef={screenshotRef}
              isImagePopoverOpen={isImagePopoverOpen}
            />
          )}
          {!imgSrc && !screenshotRef && (
            <NoImageDisplay imageCaption={ImageCaption} isLoading={loading || !allStepsLoaded} />
          )}
        </StepDiv>
      </EuiFlexItem>

      {label && (
        <EuiFlexItem grow={false}>
          <EuiText className="eui-textNoWrap">{label}</EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
