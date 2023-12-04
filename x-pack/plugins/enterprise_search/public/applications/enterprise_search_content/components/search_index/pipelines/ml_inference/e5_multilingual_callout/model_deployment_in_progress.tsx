/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { E5MultilingualCallOutState, E5MultilingualDismissButton } from './e5_multilingual_callout';

export const ModelDeploymentInProgress = ({
  dismiss,
  isDismissable,
}: Pick<E5MultilingualCallOutState, 'dismiss' | 'isDismissable'>) => (
  <EuiCallOut color="primary">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon color="primary" type="clock" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText color="primary" size="xs">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.deployingTitle',
                  { defaultMessage: 'Your E5 model is deploying.' }
                )}
              </h3>
            </EuiText>
          </EuiFlexItem>
          {isDismissable && (
            <EuiFlexItem grow={false}>
              <E5MultilingualDismissButton dismiss={dismiss} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.deployingBody',
              {
                defaultMessage:
                  'You can continue creating your pipeline with other uploaded models in the meantime.',
              }
            )}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);
