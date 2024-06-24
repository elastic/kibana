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
import { ShrinkAction } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

export const Shrink = ({ shrink }: { shrink?: ShrinkAction }) => {
  return shrink ? (
    <>
      <EuiDescriptionListTitle>{i18nTexts.editPolicy.shrinkActionLabel}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {shrink.number_of_shards && (
          <EuiText color="subdued">
            <EuiSpacer size="s" />
            {i18nTexts.editPolicy.shrinkNumberOfShardsLabel}
            {': '}
            <strong>{shrink.number_of_shards}</strong>
          </EuiText>
        )}

        {shrink.max_primary_shard_size && (
          <EuiText color="subdued">
            <EuiSpacer size="s" />
            {i18nTexts.editPolicy.maxPrimaryShardSizeLabel}
            {': '}
            <strong>{shrink.max_primary_shard_size}</strong>
          </EuiText>
        )}
      </EuiDescriptionListDescription>
    </>
  ) : null;
};
