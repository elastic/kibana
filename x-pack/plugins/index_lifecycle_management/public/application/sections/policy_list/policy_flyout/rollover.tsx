/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RolloverAction } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

export const Rollover = ({ rollover }: { rollover?: RolloverAction }) => {
  return rollover ? (
    <>
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.policyFlyout.rolloverTitle"
          defaultMessage="Rollover"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {rollover.max_primary_shard_size && (
          <EuiText color="subdued">
            <EuiSpacer size="s" />
            {i18nTexts.editPolicy.maxPrimaryShardSizeLabel}
            {': '}
            <strong>{rollover.max_primary_shard_size}</strong>
          </EuiText>
        )}
        {rollover.max_primary_shard_docs && (
          <EuiText color="subdued">
            <EuiSpacer size="s" />
            {i18nTexts.editPolicy.maxPrimaryShardDocsLabel}
            {': '}
            <strong>{rollover.max_primary_shard_docs}</strong>
          </EuiText>
        )}
        {rollover.max_age && (
          <EuiText color="subdued">
            <EuiSpacer size="s" />
            {i18nTexts.editPolicy.maxAgeLabel}
            {': '}
            <strong>{rollover.max_age}</strong>
          </EuiText>
        )}
        {rollover.max_docs && (
          <EuiText color="subdued">
            <EuiSpacer size="s" />
            {i18nTexts.editPolicy.maxDocsLabel}
            {': '}
            <strong>{rollover.max_docs}</strong>
          </EuiText>
        )}
        {rollover.max_size && (
          <EuiText color="subdued">
            <EuiSpacer size="s" />
            {i18nTexts.editPolicy.maxSizeLabel}
            {': '}
            <strong>{rollover.max_size}</strong>{' '}
            <EuiBadge color="warning">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyFlyout.deprecatedLabel"
                defaultMessage="Deprecated"
              />
            </EuiBadge>
          </EuiText>
        )}
      </EuiDescriptionListDescription>
    </>
  ) : null;
};
