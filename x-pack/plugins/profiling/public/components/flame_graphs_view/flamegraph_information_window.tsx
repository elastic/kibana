/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getImpactRows } from './get_impact_rows';
import { getInformationRows } from './get_information_rows';

interface Props {
  frame?: {
    fileID: string;
    frameType: number;
    exeFileName: string;
    addressOrLine: number;
    functionName: string;
    sourceFileName: string;
    sourceLine: number;
    countInclusive: number;
    countExclusive: number;
  };
  totalSamples: number;
  totalSeconds: number;
  onClose: () => void;
}

function KeyValueList({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {rows.map((row, index) => (
        <>
          <EuiFlexItem>
            <EuiFlexGroup direction="row">
              <EuiFlexItem grow>{row.label}:</EuiFlexItem>
              <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end', overflowWrap: 'anywhere' }}>
                {row.value}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {index < rows.length - 1 ? (
            <EuiFlexItem>
              <EuiHorizontalRule size="full" margin="none" />
            </EuiFlexItem>
          ) : undefined}
        </>
      ))}
    </EuiFlexGroup>
  );
}

function FlamegraphFrameInformationPanel({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <EuiPanel style={{ width: 400, maxHeight: '100%', overflow: 'auto' }} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow>
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h2>
                      {i18n.translate('xpack.profiling.flameGraphInformationWindowTitle', {
                        defaultMessage: 'Frame information',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon iconType="cross" onClick={() => onClose()} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function FlamegraphInformationWindow({ onClose, frame, totalSamples, totalSeconds }: Props) {
  if (!frame) {
    return (
      <FlamegraphFrameInformationPanel onClose={onClose}>
        <EuiText>
          {i18n.translate('xpack.profiling.flamegraphInformationWindow.selectFrame', {
            defaultMessage: 'Click on a frame to display more information',
          })}
        </EuiText>
      </FlamegraphFrameInformationPanel>
    );
  }

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
    <FlamegraphFrameInformationPanel onClose={onClose}>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <KeyValueList rows={informationRows} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h2>
                  {i18n.translate(
                    'xpack.profiling.flameGraphInformationWindow.impactEstimatesTitle',
                    { defaultMessage: 'Impact estimates' }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <KeyValueList rows={impactRows} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlamegraphFrameInformationPanel>
  );
}
