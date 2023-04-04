/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { MITRE_ATTACK_DETAILS_TEST_ID, MITRE_ATTACK_TITLE_TEST_ID } from './test_ids';
import { getMitreComponentPartsArray } from '../../../detections/mitre/get_mitre_threat_component';
import { useRightPanelContext } from '../context';

export const MitreAttack: FC = () => {
  const { searchHit, dataFormattedForFieldBrowser } = useRightPanelContext();
  const threatDetailsArray = useMemo(
    () => getMitreComponentPartsArray(searchHit, dataFormattedForFieldBrowser),
    [searchHit, dataFormattedForFieldBrowser]
  );

  if (!threatDetailsArray || threatDetailsArray.length < 1) {
    return null;
  }

  return (
    <>
      {threatDetailsArray.map((threatDetails) => (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem data-test-subj={MITRE_ATTACK_TITLE_TEST_ID}>
            <EuiTitle size="xxs">
              <h5>{threatDetails[0].title}</h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj={MITRE_ATTACK_DETAILS_TEST_ID}>
            {threatDetails[0].description}
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
};

MitreAttack.displayName = 'MitreAttack';
