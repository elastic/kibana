/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { MITRE_ATTACK_DETAILS_TEST_ID, MITRE_ATTACK_TITLE_TEST_ID } from './test_ids';
import { getMitreComponentParts } from '../../../../detections/mitre/get_mitre_threat_component';
import { useDocumentDetailsContext } from '../../shared/context';

export const MitreAttack: FC = () => {
  const { searchHit } = useDocumentDetailsContext();
  const threatDetails = useMemo(() => getMitreComponentParts(searchHit), [searchHit]);

  if (!threatDetails || !threatDetails[0]) {
    // Do not render empty message on MITRE attack because other frameworks could be used
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiSpacer size="m" />
      <EuiFlexItem data-test-subj={MITRE_ATTACK_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>{threatDetails[0].title}</h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={MITRE_ATTACK_DETAILS_TEST_ID}>
        {threatDetails[0].description}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

MitreAttack.displayName = 'MitreAttack';
