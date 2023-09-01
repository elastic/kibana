/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  FrameSymbolStatus,
  getFrameSymbolStatus,
} from '@kbn/profiling-data-access-plugin/common/profiling';
import React from 'react';
import { FrameInformationAIAssistant } from './frame_information_ai_assistant';
import { FrameInformationPanel } from './frame_information_panel';
import { getImpactRows } from './get_impact_rows';
import { getInformationRows } from './get_information_rows';
import { KeyValueList } from './key_value_list';
import { MissingSymbolsCallout } from './missing_symbols_callout';

export interface Frame {
  fileID: string;
  frameType: number;
  exeFileName: string;
  addressOrLine: number;
  functionName: string;
  sourceFileName: string;
  sourceLine: number;
  countInclusive: number;
  countExclusive: number;
}

export interface Props {
  frame?: Frame;
  totalSamples: number;
  totalSeconds: number;
  showAIAssistant?: boolean;
  showSymbolsStatus?: boolean;
}

export function FrameInformationWindow({
  frame,
  totalSamples,
  totalSeconds,
  showAIAssistant = true,
  showSymbolsStatus = true,
}: Props) {
  if (!frame) {
    return (
      <FrameInformationPanel>
        <EuiText>
          {i18n.translate('xpack.profiling.frameInformationWindow.selectFrame', {
            defaultMessage: 'Click on a frame to display more information',
          })}
        </EuiText>
      </FrameInformationPanel>
    );
  }

  const symbolStatus = getFrameSymbolStatus({
    sourceFilename: frame.sourceFileName,
    sourceLine: frame.sourceLine,
    exeFileName: frame.exeFileName,
  });

  const {
    fileID,
    frameType,
    exeFileName,
    addressOrLine,
    functionName,
    sourceFileName,
    sourceLine,
    countInclusive,
    countExclusive,
  } = frame;

  const informationRows = getInformationRows({
    fileID,
    frameType,
    exeFileName,
    addressOrLine,
    functionName,
    sourceFileName,
    sourceLine,
  });

  const impactRows = getImpactRows({
    countInclusive,
    countExclusive,
    totalSamples,
    totalSeconds,
  });

  return (
    <FrameInformationPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <KeyValueList data-test-subj="informationRows" rows={informationRows} />
        </EuiFlexItem>
        {showAIAssistant ? (
          <EuiFlexItem>
            <FrameInformationAIAssistant frame={frame} />
          </EuiFlexItem>
        ) : null}
        {showSymbolsStatus && symbolStatus !== FrameSymbolStatus.SYMBOLIZED ? (
          <EuiFlexItem>
            <MissingSymbolsCallout frameType={frame.frameType} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h2>
                  {i18n.translate('xpack.profiling.frameInformationWindow.impactEstimatesTitle', {
                    defaultMessage: 'Impact estimates',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <KeyValueList data-test-subj="impactEstimates" rows={impactRows} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FrameInformationPanel>
  );
}
