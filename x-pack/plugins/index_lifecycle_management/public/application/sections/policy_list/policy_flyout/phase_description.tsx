/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiDescriptionListDescription, EuiDescriptionListTitle } from '@elastic/eui';
import { SerializedPhase } from '../../../../../common/types';

export const PhaseDescription = ({
  title,
  phase,
}: {
  title: React.ReactNode;
  phase: SerializedPhase;
}) => {
  return (
    <>
      <EuiDescriptionListTitle data-test-subj="phaseTitle">{title}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiCodeBlock language="json">{JSON.stringify(phase, null, 2)}</EuiCodeBlock>
      </EuiDescriptionListDescription>
    </>
  );
};
