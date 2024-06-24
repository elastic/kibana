/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCode,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { SerializedDeletePhase } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

export const WaitForSnapshot = ({
  waitForSnapshot,
}: {
  waitForSnapshot?: SerializedDeletePhase['actions']['wait_for_snapshot'];
}) => {
  return waitForSnapshot ? (
    <>
      <EuiDescriptionListTitle>{i18nTexts.editPolicy.waitForSnapshotLabel}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiText color="subdued">
          <EuiSpacer size="s" />
          <EuiCode>{waitForSnapshot.policy}</EuiCode>
        </EuiText>
      </EuiDescriptionListDescription>
    </>
  ) : null;
};
