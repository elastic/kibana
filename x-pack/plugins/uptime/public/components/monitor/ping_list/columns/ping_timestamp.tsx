/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';
import styled from 'styled-components';
import { Ping } from '../../../../../common/runtime_types/ping';
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

  const [maxStep, setMaxStep] = useState<number | null>(null);

  const { basePath } = useContext(UptimeSettingsContext);

  const timeStamp = moment(timestamp);

  let checkedTime = '';

  if (moment().diff(timeStamp, 'd') > 1) {
    checkedTime = timeStamp.format('ll LTS');
  } else {
    checkedTime = timeStamp.format('LTS');
  }

  const imgSrc = basePath + `/api/uptime/journey/screenshot/${ping.monitor.check_group}/${stepNo}`;

  return (
    <StepDiv>
      <StepImage
        allowFullScreen={true}
        size="s"
        hasShadow
        caption={
          <>
            <EuiFlexGroup
              className="stepArrowsFullScreen"
              gutterSize="s"
              alignItems="center"
              style={{ position: 'absolute', bottom: 32, left: 'calc(50% - 32px)' }}
            >
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  disabled={stepNo === 1}
                  color="subdued"
                  size="m"
                  onClick={() => {
                    setStepNo(stepNo - 1);
                  }}
                  iconType="arrowLeft"
                  aria-label="Next"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  disabled={stepNo === maxStep}
                  color="subdued"
                  size="m"
                  onClick={() => {
                    setStepNo(stepNo + 1);
                  }}
                  iconType="arrowRight"
                  aria-label="Next"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiLink href={'/step/details'}>{checkedTime}</EuiLink>
            <EuiSpacer size="s" />
          </>
        }
        alt="NO IMAGE AVAILABLE"
        url={imgSrc}
        onError={() => {
          setMaxStep(stepNo - 1);
          setStepNo(stepNo - 1);
        }}
      />
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
            disabled={stepNo === maxStep}
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
