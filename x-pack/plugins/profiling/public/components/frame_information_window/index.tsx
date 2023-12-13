/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FrameSymbolStatus, getFrameSymbolStatus } from '@kbn/profiling-utils';
import React from 'react';
import { FrameInformationAIAssistant } from './frame_information_ai_assistant';
import { FrameInformationPanel } from './frame_information_panel';
import { ImpactRow } from './get_impact_rows';
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
  selfAnnualCO2Kgs: number;
  totalAnnualCO2Kgs: number;
  selfAnnualCostUSD: number;
  totalAnnualCostUSD: number;
}

export interface Props {
  frame: Frame;
  impactRows: ImpactRow[];
  showAIAssistant?: boolean;
  showSymbolsStatus?: boolean;
}

export function FrameInformationWindow({ frame, showSymbolsStatus = true, impactRows }: Props) {
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

  return (
    <FrameInformationPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <KeyValueList data-test-subj="informationRows" rows={informationRows} />
        </EuiFlexItem>
        <EuiFlexItem>
          <FrameInformationAIAssistant frame={frame} />
        </EuiFlexItem>
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
