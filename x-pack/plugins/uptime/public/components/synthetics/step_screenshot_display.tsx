/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiImage, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useContext, useEffect, useRef, useState, FC } from 'react';
import useIntersection from 'react-use/lib/useIntersection';
import { isScreenshotRef as isAScreenshotRef } from '../../../common/runtime_types';
import { UptimeSettingsContext, UptimeThemeContext } from '../../contexts';
import { useFetcher } from '../../../../observability/public';
import { getJourneyScreenshot } from '../../state/api/journey';
import { composeScreenshotRef } from '../../lib/helper/compose_screenshot_images';

interface StepScreenshotDisplayProps {
  screenshotExists?: boolean;
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

export const StepScreenshotDisplay: FC<StepScreenshotDisplayProps> = ({
  checkGroup,
  screenshotExists,
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

  const [img, setImg] = useState<string | undefined>(undefined);
  const { data } = useFetcher(() => {
    if (isScreenshotRef) {
      return getJourneyScreenshot(
        `${basePath}/api/uptime/journey/screenshot/${checkGroup}/${stepIndex}`
      );
    }
  }, [basePath, checkGroup, stepIndex, isScreenshotRef]);
  useEffect(() => {
    if (isAScreenshotRef(data)) {
      const canvas = document.createElement('canvas');
      composeScreenshotRef(data, canvas).then(() => {
        const imgdata = canvas.toDataURL('image/jpg', 1.0);
        setImg(imgdata);
      });
    } else {
      setImg(imgSrc);
    }
  }, [data, imgSrc]);
  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: pageBackground, height: IMAGE_HEIGHT, width: IMAGE_WIDTH }}
    >
      {(hasIntersected || !lazyLoad) && (screenshotExists || isScreenshotRef) && (
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
          url={img}
        />
      )}
      {!screenshotExists && !isScreenshotRef && (
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
