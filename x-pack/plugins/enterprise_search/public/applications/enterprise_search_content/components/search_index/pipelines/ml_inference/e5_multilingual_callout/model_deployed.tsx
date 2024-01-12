/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  E5MultilingualCallOutState,
  E5MultilingualDismissButton,
  FineTuneModelsButton,
} from './e5_multilingual_callout';
import { E5MultilingualCalloutLogic } from './e5_multilingual_callout_logic';

export const ModelDeployed = ({
  dismiss,
  ingestionMethod,
  isDismissable,
  isStartButtonDisabled,
}: Pick<
  E5MultilingualCallOutState,
  'dismiss' | 'ingestionMethod' | 'isDismissable' | 'isStartButtonDisabled'
>) => {
  const { startE5MultilingualModel } = useActions(E5MultilingualCalloutLogic);

  return (
    <EuiCallOut color="primary">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon color="primary" type="checkInCircleFilled" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText color="primary" size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.deployedTitle',
                    { defaultMessage: 'Your E5 model has deployed but not started.' }
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
                'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.deployedBody',
                {
                  defaultMessage:
                    'You may start the model in a single-threaded configuration for testing, or tune the performance for a production environment.',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            alignItems="center"
            justifyContent="flexStart"
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-e5MultilingualCallOut-startModel`}
                disabled={isStartButtonDisabled}
                iconType="playFilled"
                onClick={() => startE5MultilingualModel()}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualCallOut.startModelButton.label',
                  {
                    defaultMessage: 'Start single-threaded',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FineTuneModelsButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
