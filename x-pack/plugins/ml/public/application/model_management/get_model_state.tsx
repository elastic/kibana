/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DEPLOYMENT_STATE, MODEL_STATE, type ModelState } from '@kbn/ml-trained-models-utils';
import {
  EuiBadge,
  EuiHealth,
  EuiLoadingSpinner,
  type EuiHealthProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NLPModelItem } from '../../../common/types/trained_models';

/**
 * Resolves result model state based on the state of each deployment.
 *
 * If at least one deployment is in the STARTED state, the model state is STARTED.
 * Then if none of the deployments are in the STARTED state, but at least one is in the STARTING state, the model state is STARTING.
 * If all deployments are in the STOPPING state, the model state is STOPPING.
 */
export const getModelDeploymentState = (model: NLPModelItem): ModelState | undefined => {
  if (!model.stats?.deployment_stats?.length) return;

  if (model.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTED)) {
    return MODEL_STATE.STARTED;
  }
  if (model.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTING)) {
    return MODEL_STATE.STARTING;
  }
  if (model.stats?.deployment_stats?.every((v) => v.state === DEPLOYMENT_STATE.STOPPING)) {
    return MODEL_STATE.STOPPING;
  }
};

export const getModelStateColor = (
  state: ModelState | undefined
): { color: EuiHealthProps['color']; name: string; component?: React.ReactNode } | null => {
  switch (state) {
    case MODEL_STATE.DOWNLOADED:
      return {
        color: 'success',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.downloadedName', {
          defaultMessage: 'Ready to deploy',
        }),
      };
    case MODEL_STATE.DOWNLOADING:
      return {
        color: 'primary',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.downloadingName', {
          defaultMessage: 'Downloading',
        }),
      };
    case MODEL_STATE.STARTED:
      return {
        color: '#E6F9F7',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.startedName', {
          defaultMessage: 'Deployed',
        }),
        get component() {
          return (
            <EuiBadge color={this.color}>
              <EuiHealth color={'success'} textSize="xs" css={{ display: 'inline' }}>
                {this.name}
              </EuiHealth>
            </EuiBadge>
          );
        },
      };
    case MODEL_STATE.STARTING:
      return {
        color: 'success',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.startingName', {
          defaultMessage: 'Deploying',
        }),
        get component() {
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{this.name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      };
    case MODEL_STATE.STOPPING:
      return {
        color: 'accent',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.stoppingName', {
          defaultMessage: 'Stopping',
        }),
        get component() {
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{this.name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      };
    case MODEL_STATE.NOT_DOWNLOADED:
    default:
      return null;
  }
};
