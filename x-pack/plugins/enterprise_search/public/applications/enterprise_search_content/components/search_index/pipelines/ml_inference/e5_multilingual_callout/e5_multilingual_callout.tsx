/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useCallback, useState } from 'react';

import { useValues } from 'kea';

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../../shared/kibana';

import { useLocalStorage } from '../../../../../../shared/use_local_storage';

import { IndexViewLogic } from '../../../index_view_logic';

import { TRAINED_MODELS_PATH } from '../utils';

import { DeployModel } from './deploy_model';
import { E5MultilingualCalloutLogic } from './e5_multilingual_callout_logic';
import { E5MultilingualErrors } from './e5_multilingual_errors';
import { ModelDeployed } from './model_deployed';
import { ModelDeploymentInProgress } from './model_deployment_in_progress';
import { ModelStarted } from './model_started';

export interface E5MultilingualCallOutState {
  dismiss: () => void;
  ingestionMethod: string;
  isCompact: boolean;
  isCreateButtonDisabled: boolean;
  isDismissable: boolean;
  isSingleThreaded: boolean;
  isStartButtonDisabled: boolean;
  show: boolean;
}

export interface E5MultilingualCallOutProps {
  isCompact?: boolean;
  isDismissable?: boolean;
}

export const E5_MULTILINGUAL_CALL_OUT_DISMISSED_KEY =
  'enterprise-search-e5-multilingual-callout-dismissed';

export const E5MultilingualDismissButton = ({
  dismiss,
}: Pick<E5MultilingualCallOutState, 'dismiss'>) => {
  return (
    <EuiButtonIcon
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.dismissButton',
        { defaultMessage: 'Dismiss E5 call out' }
      )}
      iconType="cross"
      onClick={dismiss}
    />
  );
};

export const FineTuneModelsButton: React.FC = () => (
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
      'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualCallOut.fineTuneModelButton',
      {
        defaultMessage: 'Fine-tune performance',
      }
    )}
  </EuiButtonEmpty>
);

export const E5MultilingualCallOut: React.FC<E5MultilingualCallOutProps> = (props) => {
  const isCompact = props.isCompact !== undefined ? props.isCompact : false;
  const isDismissable = props.isDismissable !== undefined ? props.isDismissable : false;

  const [calloutDismissed, setCalloutDismissed] = useLocalStorage<boolean>(
    E5_MULTILINGUAL_CALL_OUT_DISMISSED_KEY,
    false
  );

  const [show, setShow] = useState<boolean>(() => {
    if (!isDismissable) return true;
    return !calloutDismissed;
  });

  const dismiss = useCallback(() => {
    setShow(false);
    setCalloutDismissed(true);
  }, []);

  const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    isCreateButtonDisabled,
    isModelDownloadInProgress,
    isModelDownloaded,
    isModelRunningSingleThreaded,
    isModelStarted,
    e5MultilingualError,
    isStartButtonDisabled,
  } = useValues(E5MultilingualCalloutLogic);

  if (e5MultilingualError) return <E5MultilingualErrors error={e5MultilingualError} />;

  if (!show) return null;

  if (isModelDownloadInProgress) {
    return <ModelDeploymentInProgress dismiss={dismiss} isDismissable={isDismissable} />;
  } else if (isModelDownloaded) {
    return (
      <ModelDeployed
        dismiss={dismiss}
        ingestionMethod={ingestionMethod}
        isDismissable={isDismissable}
        isStartButtonDisabled={isStartButtonDisabled}
      />
    );
  } else if (isModelStarted) {
    return (
      <ModelStarted
        dismiss={dismiss}
        isCompact={isCompact}
        isDismissable={isDismissable}
        isSingleThreaded={isModelRunningSingleThreaded}
      />
    );
  }

  return (
    <DeployModel
      dismiss={dismiss}
      ingestionMethod={ingestionMethod}
      isDismissable={isDismissable}
      isCreateButtonDisabled={isCreateButtonDisabled}
    />
  );
};
