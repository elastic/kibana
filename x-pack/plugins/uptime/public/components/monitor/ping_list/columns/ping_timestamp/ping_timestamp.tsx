/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiImage, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useIntersection from 'react-use/lib/useIntersection';
import styled from 'styled-components';
import { Ping } from '../../../../../../common/runtime_types/ping';
import { useFetcher, FETCH_STATUS } from '../../../../../../../observability/public';
import { getJourneyScreenshot } from '../../../../../state/api/journey';
import { UptimeSettingsContext } from '../../../../../contexts';
import { NoImageAvailable } from './no_image_available';
import { NavButtons } from './nav_buttons';
import { StepImageCaption } from './step_image_caption';

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

const POPOVER_IMG_HEIGHT = 360;
const POPOVER_IMG_WIDTH = 640;

interface Props {
  timestamp: string;
  ping: Ping;
}

export const PingTimestamp = ({ timestamp, ping }: Props) => {
  const [stepNo, setStepNo] = useState(1);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);

  const [stepImages, setStepImages] = useState<string[]>([]);

  const intersectionRef = React.useRef(null);

  const { basePath } = useContext(UptimeSettingsContext);

  const imgPath = basePath + `/api/uptime/journey/screenshot/${ping.monitor.check_group}/${stepNo}`;

  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  const { data, status } = useFetcher(() => {
    if (intersection && intersection.intersectionRatio === 1 && !stepImages[stepNo - 1])
      return getJourneyScreenshot(imgPath);
  }, [intersection?.intersectionRatio, stepNo]);

  useEffect(() => {
    if (data) {
      setStepImages((prevState) => [...prevState, data?.src]);
    }
  }, [data]);

  const imgSrc = stepImages[stepNo] || data?.src;

  const isLoading = status === FETCH_STATUS.LOADING;
  const isPending = status === FETCH_STATUS.PENDING;

  const captionContent = `Step:${stepNo} ${data?.stepName}`;

  const ImageCaption = (
    <StepImageCaption
      captionContent={captionContent}
      imgSrc={imgSrc}
      maxSteps={data?.maxSteps}
      setStepNo={setStepNo}
      stepNo={stepNo}
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
        <EuiPopover
          anchorPosition="rightCenter"
          button={
            <StepImage
              allowFullScreen={true}
              alt={captionContent}
              caption={ImageCaption}
              data-test-subj="pingTimestampImage"
              hasShadow
              url={imgSrc}
              size="s"
            />
          }
          closePopover={() => setIsImagePopoverOpen(false)}
          isOpen={isImagePopoverOpen}
        >
          <EuiImage
            alt={i18n.translate('xpack.uptime.synthetics.thumbnail.fullSize.alt', {
              defaultMessage: `A full-size screenshot for this journey step's thumbnail.`,
            })}
            url={imgSrc}
            style={{ height: POPOVER_IMG_HEIGHT, width: POPOVER_IMG_WIDTH, objectFit: 'contain' }}
          />
        </EuiPopover>
      ) : (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            {isLoading || isPending ? (
              <EuiLoadingSpinner size="xl" data-test-subj="pingTimestampSpinner" />
            ) : (
              <NoImageAvailable />
            )}
          </EuiFlexItem>
          <EuiFlexItem>{ImageCaption}</EuiFlexItem>
        </EuiFlexGroup>
      )}
      <NavButtons
        maxSteps={data?.maxSteps}
        setIsImagePopoverOpen={setIsImagePopoverOpen}
        setStepNo={setStepNo}
        stepNo={stepNo}
      />
    </StepDiv>
  );
};
