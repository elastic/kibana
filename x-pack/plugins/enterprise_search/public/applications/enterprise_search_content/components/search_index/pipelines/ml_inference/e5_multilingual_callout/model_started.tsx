/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../../shared/kibana';

import { TRAINED_MODELS_PATH } from '../utils';

import {
  E5MultilingualCallOutState,
  E5MultilingualDismissButton,
  FineTuneModelsButton,
} from './e5_multilingual_callout';

export const ModelStarted = ({
  dismiss,
  isCompact,
  isDismissable,
  isSingleThreaded,
}: Pick<
  E5MultilingualCallOutState,
  'dismiss' | 'isCompact' | 'isDismissable' | 'isSingleThreaded'
>) => (
  <EuiCallOut color="primary">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText color="primary" size="xs">
              <h3>
                {isSingleThreaded
                  ? isCompact
                    ? i18n.translate(
                        'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.startedSingleThreadedTitleCompact',
                        { defaultMessage: 'Your E5 model is running single-threaded.' }
                      )
                    : i18n.translate(
                        'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.startedSingleThreadedTitle',
                        { defaultMessage: 'Your E5 model has started single-threaded.' }
                      )
                  : isCompact
                  ? i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.startedTitleCompact',
                      { defaultMessage: 'Your E5 model is running.' }
                    )
                  : i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.startedTitle',
                      { defaultMessage: 'Your E5 model has started.' }
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
      {!isCompact && (
        <>
          <EuiFlexItem grow>
            <EuiText size="s">
              <p>
                {isSingleThreaded
                  ? i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.startedSingleThreadedBody',
                      {
                        defaultMessage:
                          'This single-threaded configuration is great for testing your custom inference pipelines, however performance should be fine-tuned for production.',
                      }
                    )
                  : i18n.translate(
                      'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.startedBody',
                      {
                        defaultMessage: 'Enjoy the power of E5 in your custom Inference pipeline.',
                      }
                    )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction="row"
              gutterSize="m"
              alignItems="center"
              justifyContent="flexStart"
            >
              <EuiFlexItem grow={false}>
                {isSingleThreaded ? (
                  <FineTuneModelsButton />
                ) : (
                  <EuiButtonEmpty
                    iconSide="left"
                    iconType="wrench"
                    onClick={() =>
                      KibanaLogic.values.navigateToUrl(TRAINED_MODELS_PATH, {
                        shouldNotCreateHref: true,
                      })
                    }
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualCallOut.viewModelsButton',
                      {
                        defaultMessage: 'View details',
                      }
                    )}
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  </EuiCallOut>
);
