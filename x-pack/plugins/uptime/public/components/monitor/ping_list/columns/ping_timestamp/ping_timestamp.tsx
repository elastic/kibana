/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import useIntersection from 'react-use/lib/useIntersection';
import styled from 'styled-components';
import { Ping } from '../../../../../../common/runtime_types/ping';
import { useFetcher, FETCH_STATUS } from '../../../../../../../observability/public';
import { getJourneyScreenshot } from '../../../../../state/api/journey';
import { UptimeSettingsContext } from '../../../../../contexts';
import { NavButtons } from './nav_buttons';
import { NoImageDisplay } from './no_image_display';
import { StepImageCaption } from './step_image_caption';
import { StepImagePopover } from './step_image_popover';
import { formatCaptionContent } from './translations';

const StepDiv = styled.div`
  figure.euiImage {
    div.stepArrowsFullScreen {
      display: none;
    }
  }

  figure.euiImage-isFullScreen {
    div.stepArrowsFullScreen {
      display: flex;
    }
  }
  position: relative;
  div.stepArrows {
    display: none;
  }
  :hover {
    div.stepArrows {
      display: flex;
    }
  }
`;

interface Props {
  timestamp: string;
  ping: Ping;
}

export const PingTimestamp = ({ timestamp, ping }: Props) => {
  const [stepNumber, setStepNumber] = useState(1);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);

  const [stepImages, setStepImages] = useState<string[]>([]);

  const intersectionRef = React.useRef(null);

  const { basePath } = useContext(UptimeSettingsContext);

  const imgPath = `${basePath}/api/uptime/journey/screenshot/${ping.monitor.check_group}/${stepNumber}`;

  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  const { data, status } = useFetcher(() => {
    if (intersection && intersection.intersectionRatio === 1 && !stepImages[stepNumber - 1])
      return getJourneyScreenshot(imgPath);
  }, [intersection?.intersectionRatio, stepNumber]);

  useEffect(() => {
    if (data) {
      setStepImages((prevState) => [...prevState, data?.src]);
    }
  }, [data]);

  const imgSrc = stepImages[stepNumber] || data?.src;

  const captionContent = formatCaptionContent(stepNumber, data?.maxSteps);

  const ImageCaption = (
    <StepImageCaption
      captionContent={captionContent}
      imgSrc={imgSrc}
      maxSteps={data?.maxSteps}
      setStepNumber={setStepNumber}
      stepNumber={stepNumber}
      timestamp={timestamp}
    />
  );

  return (
    <StepDiv
      onMouseEnter={() => setIsImagePopoverOpen(true)}
      onMouseLeave={() => setIsImagePopoverOpen(false)}
      ref={intersectionRef}
    >
      {imgSrc ? (
        <StepImagePopover
          captionContent={captionContent}
          imageCaption={ImageCaption}
          imgSrc={imgSrc}
          isImagePopoverOpen={isImagePopoverOpen}
        />
      ) : (
        <NoImageDisplay
          imageCaption={ImageCaption}
          isLoading={status === FETCH_STATUS.LOADING}
          isPending={status === FETCH_STATUS.PENDING}
        />
      )}
      <NavButtons
        maxSteps={data?.maxSteps}
        setIsImagePopoverOpen={setIsImagePopoverOpen}
        setStepNumber={setStepNumber}
        stepNumber={stepNumber}
      />
    </StepDiv>
  );
};
