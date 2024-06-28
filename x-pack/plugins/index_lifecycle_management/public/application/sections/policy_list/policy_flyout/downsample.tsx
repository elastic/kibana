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
import { DownsampleAction } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

export const Downsample = ({ downsample }: { downsample?: DownsampleAction }) => {
  return downsample ? (
    <>
      <EuiDescriptionListTitle>{i18nTexts.editPolicy.downsampleLabel}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiText color="subdued">
          <EuiSpacer size="s" />
          {i18nTexts.editPolicy.downsampleIntervalFieldLabel}
          {': '}
          <strong>{downsample.fixed_interval}</strong>
        </EuiText>
      </EuiDescriptionListDescription>
    </>
  ) : null;
};
