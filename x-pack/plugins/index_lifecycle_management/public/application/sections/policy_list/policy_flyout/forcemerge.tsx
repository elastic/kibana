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
import { FormattedMessage } from '@kbn/i18n-react';
import { ForcemergeAction } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';
import { i18nTexts as i18nTextsFlyout } from './i18n_texts';

export const Forcemerge = ({ forcemerge }: { forcemerge?: ForcemergeAction }) => {
  return forcemerge ? (
    <>
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.policyFlyout.forcemergeLabel"
          defaultMessage="Forcemerge"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiText color="subdued">
          <EuiSpacer size="s" />
          {i18nTexts.editPolicy.maxNumSegmentsFieldLabel}
          {': '}
          <strong>{forcemerge.max_num_segments}</strong>
        </EuiText>

        <EuiText color="subdued">
          <EuiSpacer size="s" />
          {i18nTexts.editPolicy.bestCompressionFieldLabel}
          {': '}
          <strong>
            {forcemerge.index_codec === 'best_compression'
              ? i18nTextsFlyout.yes
              : i18nTextsFlyout.no}
          </strong>
        </EuiText>
      </EuiDescriptionListDescription>
    </>
  ) : null;
};
