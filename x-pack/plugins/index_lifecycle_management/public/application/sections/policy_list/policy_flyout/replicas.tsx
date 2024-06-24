/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AllocateAction } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

export const Replicas = ({ allocate }: { allocate?: AllocateAction }) => {
  return allocate?.number_of_replicas !== undefined ? (
    <>
      <EuiDescriptionListTitle>{i18nTexts.editPolicy.replicasLabel}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiText color="subdued">
          <EuiSpacer size="s" />
          {i18nTexts.editPolicy.numberOfReplicasLabel}
          {': '}
          <strong>{allocate.number_of_replicas}</strong>
        </EuiText>
      </EuiDescriptionListDescription>
    </>
  ) : null;
};
