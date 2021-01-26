/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import { nextAriaLabel, prevAriaLabel } from './translations';
import { getShortTimeStamp } from '../../../../overview/monitor_list/columns/monitor_status_column';

export interface StepImageCaptionProps {
  captionContent: string;
  imgSrc?: string;
  maxSteps?: number;
  setStepNo: React.Dispatch<React.SetStateAction<number>>;
  stepNo: number;
  timestamp: string;
}

export const StepImageCaption: React.FC<StepImageCaptionProps> = ({
  captionContent,
  imgSrc,
  maxSteps,
  setStepNo,
  stepNo,
  timestamp,
}) => {
  return (
    <>
      <div className="stepArrowsFullScreen">
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
                aria-label={prevAriaLabel}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>{captionContent}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                disabled={stepNo === maxSteps}
                size="m"
                onClick={() => {
                  setStepNo(stepNo + 1);
                }}
                iconType="arrowRight"
                aria-label={nextAriaLabel}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </div>
      {/* TODO: Add link to details page once it's available */}
      <span className="eui-textNoWrap">{getShortTimeStamp(moment(timestamp))}</span>
      <EuiSpacer size="s" />
    </>
  );
};
