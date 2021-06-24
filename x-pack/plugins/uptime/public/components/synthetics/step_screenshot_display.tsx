/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useContext, useEffect, useRef, useState, FC } from 'react';
import useIntersection from 'react-use/lib/useIntersection';
import {
  isScreenshotRef as isAScreenshotRef,
  ScreenshotRefImageData,
} from '../../../common/runtime_types';
import { UptimeSettingsContext, UptimeThemeContext } from '../../contexts';
import { useFetcher } from '../../../../observability/public';
import { getJourneyScreenshot } from '../../state/api/journey';
import { useCompositeImage } from '../../hooks';

interface StepScreenshotDisplayProps {
  isScreenshotBlob: boolean;
  isScreenshotRef: boolean;
  checkGroup?: string;
  stepIndex?: number;
  stepName?: string;
  lazyLoad?: boolean;
}

const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 360;

const StepImage = styled(EuiImage)`
  &&& {
    figcaption {
      display: none;
    }
    width: ${IMAGE_WIDTH},
    height: ${IMAGE_HEIGHT},
    objectFit: 'cover',
    objectPosition: 'center top',
  }
`;

const BaseStepImage = ({
  stepIndex,
  stepName,
  url,
}: Pick<StepScreenshotDisplayProps, 'stepIndex' | 'stepName'> & { url?: string }) => {
  if (!url) return <EuiLoadingSpinner size="l" />;
  return (
    <StepImage
      allowFullScreen={true}
      alt={
        stepName
          ? i18n.translate('xpack.uptime.synthetics.screenshotDisplay.altText', {
              defaultMessage: 'Screenshot for step with name "{stepName}"',
              values: {
                stepName,
              },
            })
          : i18n.translate('xpack.uptime.synthetics.screenshotDisplay.altTextWithoutName', {
              defaultMessage: 'Screenshot',
            })
      }
      caption={`Step:${stepIndex} ${stepName}`}
      hasShadow
      url={url}
    />
  );
};

type ComposedStepImageProps = Pick<StepScreenshotDisplayProps, 'stepIndex' | 'stepName'> & {
  url: string | undefined;
  imgRef: ScreenshotRefImageData;
  setUrl: React.Dispatch<string | undefined>;
};

const ComposedStepImage = ({
  stepIndex,
  stepName,
  url,
  imgRef,
  setUrl,
}: ComposedStepImageProps) => {
  useCompositeImage(imgRef, setUrl, url);
  if (!url) return <EuiLoadingSpinner size="l" />;
  return <BaseStepImage stepIndex={stepIndex} stepName={stepName} url={url} />;
};

export const StepScreenshotDisplay: FC<StepScreenshotDisplayProps> = ({
  checkGroup,
  isScreenshotBlob: isScreenshotBlob,
  isScreenshotRef,
  stepIndex,
  stepName,
  lazyLoad = true,
}) => {
  const containerRef = useRef(null);
  const {
    colors: { lightestShade: pageBackground },
  } = useContext(UptimeThemeContext);

  const { basePath } = useContext(UptimeSettingsContext);

  const intersection = useIntersection(containerRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  const [hasIntersected, setHasIntersected] = useState<boolean>(false);
  const isIntersecting = intersection?.isIntersecting;
  useEffect(() => {
    if (hasIntersected === false && isIntersecting === true) {
      setHasIntersected(true);
    }
  }, [hasIntersected, isIntersecting, setHasIntersected]);

  const imgSrc = basePath + `/api/uptime/journey/screenshot/${checkGroup}/${stepIndex}`;

  // When loading a legacy screenshot, set `url` to full-size screenshot path.
  // Otherwise, we first need to composite the image.
  const [url, setUrl] = useState<string | undefined>(isScreenshotBlob ? imgSrc : undefined);

  // when the image is a composite, we need to fetch the data since we cannot specify a blob URL
  const { data: screenshotRef } = useFetcher(() => {
    if (isScreenshotRef) {
      return getJourneyScreenshot(imgSrc);
    }
  }, [basePath, checkGroup, stepIndex, isScreenshotRef]);

  const shouldRenderImage = hasIntersected || !lazyLoad;
  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: pageBackground, height: IMAGE_HEIGHT, width: IMAGE_WIDTH }}
    >
      {shouldRenderImage && isScreenshotBlob && (
        <BaseStepImage stepName={stepName} stepIndex={stepIndex} url={url} />
      )}
      {shouldRenderImage && isScreenshotRef && isAScreenshotRef(screenshotRef) && (
        <ComposedStepImage
          imgRef={screenshotRef}
          stepName={stepName}
          stepIndex={stepIndex}
          setUrl={setUrl}
          url={url}
        />
      )}
      {!isScreenshotBlob && !isScreenshotRef && (
        <EuiFlexGroup
          alignItems="center"
          direction="column"
          style={{ paddingTop: '32px' }}
          data-test-subj="stepScreenshotImageUnavailable"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon color="subdued" size="xxl" type="image" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>
              <strong>
                <FormattedMessage
                  id="xpack.uptime.synthetics.screenshot.noImageMessage"
                  defaultMessage="No image available"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );
};
