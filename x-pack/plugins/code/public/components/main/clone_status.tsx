/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiProgress } from '@elastic/eui';
import {
  euiBorderThin,
  euiSizeL,
  euiSizeXs,
  paddingSizes,
} from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import styled from 'styled-components';
import { CloneProgress } from '../../../model';

export const Caption = styled.div`
  margin-bottom: ${euiSizeXs};
  font-size: ${euiSizeL};
`;

export const ProgressContainer = styled.div`
  width: 40rem;
  padding: ${paddingSizes.xs};
  border: ${euiBorderThin};
`;

interface Props {
  progress: number;
  cloneProgress: CloneProgress;
}

export const CloneStatus = (props: Props) => {
  const { progress: progressRate, cloneProgress } = props;
  let progress = `Receiving objects: ${progressRate.toFixed(2)}%`;
  if (progressRate < 0) {
    progress = 'Clone Failed';
  } else if (cloneProgress) {
    const { receivedObjects, totalObjects, indexedObjects } = cloneProgress;

    if (receivedObjects === totalObjects) {
      progress = `Indexing objects: ${progressRate.toFixed(
        2
      )}% (${indexedObjects}/${totalObjects})`;
    } else {
      progress = `Receiving objects: ${progressRate.toFixed(
        2
      )}% (${receivedObjects}/${totalObjects})`;
    }
  }
  return (
    <div>
      <Caption>{progress}</Caption>
      <ProgressContainer>
        <EuiProgress size="l" max={100} value={progressRate} />
      </ProgressContainer>
    </div>
  );
};
