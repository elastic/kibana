/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import useIntersection from 'react-use/lib/useIntersection';
import moment from 'moment';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { Ping } from '../../../../../common/runtime_types/ping';
import { getShortTimeStamp } from '../../../overview/monitor_list/columns/monitor_status_column';
import { euiStyled, useFetcher } from '../../../../../../observability/public';
import { getJourneyScreenshot } from '../../../../state/api/journey';
import { UptimeSettingsContext } from '../../../../contexts';

const StepImage = styled(EuiImage)`
  &&& {
    display: flex;
    figcaption {
      white-space: nowrap;
      align-self: center;
      margin-left: 8px;
      margin-top: 8px;
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

interface Props {
  timestamp: string;
  ping: Ping;
}

export const PingTimestamp = ({ timestamp, ping }: Props) => {
  const [stepNo, setStepNo] = useState(1);

  const [stepImages, setStepImages] = useState<string[]>([]);

  const intersectionRef = React.useRef(null);

  const { basePath } = useContext(UptimeSettingsContext);

  const imgPath = basePath + `/api/uptime/journey/screenshot/${ping.monitor.check_group}/${stepNo}`;

  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  const { data } = useFetcher(() => {
    if (intersection && intersection.intersectionRatio === 1 && !stepImages[stepNo - 1])
      return getJourneyScreenshot(imgPath);
  }, [intersection?.intersectionRatio, stepNo]);

  useEffect(() => {
    if (data) {
      setStepImages((prevState) => [...prevState, data?.src]);
    }
  }, [data]);

  const imgSrc = stepImages[stepNo] || data?.src;

  const ImageCaption = (
    <>
      <div
        className="stepArrowsFullScreen"
        style={{ position: 'absolute', bottom: 32, width: '100%' }}
      >
        {imgSrc && (
          <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                disabled={stepNo === 1}
                size="m"
                onClick={() => {
                  setStepNo(stepNo - 1);
                }}
                iconType="arrowLeft"
                aria-label="Next"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                Step:{stepNo} {data?.stepName}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                disabled={stepNo === data?.maxSteps}
                size="m"
                onClick={() => {
                  setStepNo(stepNo + 1);
                }}
                iconType="arrowRight"
                aria-label="Next"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </div>
      <EuiLink className="eui-textNoWrap" href={'/step/details'}>
        {getShortTimeStamp(moment(timestamp))}
      </EuiLink>
      <EuiSpacer size="s" />
    </>
  );

  return (
    <StepDiv ref={intersectionRef}>
      {imgSrc ? (
        <StepImage
          allowFullScreen={true}
          size="s"
          hasShadow
          caption={ImageCaption}
          alt="No image available"
          url={imgSrc}
        />
      ) : (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <NoImageAvailable />
          </EuiFlexItem>
          <EuiFlexItem> {ImageCaption}</EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup
        className="stepArrows"
        gutterSize="s"
        alignItems="center"
        style={{ position: 'absolute', bottom: 0, left: 30 }}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            disabled={stepNo === 1}
            color="subdued"
            size="s"
            onClick={() => {
              setStepNo(stepNo - 1);
            }}
            iconType="arrowLeft"
            aria-label="Next"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            disabled={stepNo === data?.maxSteps}
            color="subdued"
            size="s"
            onClick={() => {
              setStepNo(stepNo + 1);
            }}
            iconType="arrowRight"
            aria-label="Next"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </StepDiv>
  );
};

const BorderedText = euiStyled(EuiText)`
  width: 120px;
  text-align: center;
  border: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
`;

export const NoImageAvailable = () => {
  return (
    <BorderedText>
      <strong>
        <FormattedMessage
          id="xpack.uptime.synthetics.screenshot.noImageMessage"
          defaultMessage="No image available"
        />
      </strong>
    </BorderedText>
  );
};
