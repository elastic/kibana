/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedHTMLMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';
import { KibanaLogic } from '../../../../../shared/kibana';

import { useTextExpansionCallOutData } from './text_expansion_callout_data';
import { getTextExpansionError, TextExpansionCalloutLogic } from './text_expansion_callout_logic';
import { TextExpansionErrors } from './text_expansion_errors';

export interface TextExpansionCallOutState {
  dismiss: () => void;
  isCreateButtonDisabled: boolean;
  isDismissable: boolean;
  isStartButtonDisabled: boolean;
  show: boolean;
}

export interface TextExpansionCallOutProps {
  isDismissable?: boolean;
}

export const TextExpansionDismissButton = ({
  dismiss,
}: Pick<TextExpansionCallOutState, 'dismiss'>) => {
  return (
    <EuiButtonIcon
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.dismissButton',
        { defaultMessage: 'Dismiss ELSER call out' }
      )}
      iconType="cross"
      onClick={dismiss}
    />
  );
};

export const DeployModel = ({
  dismiss,
  isCreateButtonDisabled,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isCreateButtonDisabled' | 'isDismissable'>) => {
  const { createTextExpansionModel } = useActions(TextExpansionCalloutLogic);

  return (
    <EuiCallOut color="success">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.titleBadge"
                  defaultMessage="New"
                />
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText color="success" size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.title',
                    { defaultMessage: 'Improve your results with ELSER' }
                  )}
                </h3>
              </EuiText>
            </EuiFlexItem>
            {isDismissable && (
              <EuiFlexItem grow={false}>
                <TextExpansionDismissButton dismiss={dismiss} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiText size="s">
                <FormattedHTMLMessage
                  id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.body"
                  defaultMessage="ELSER (Elastic Learned Sparse EncodeR) is our <strong>new trained machine learning model</strong> designed to efficiently use context in natural language queries. This model delivers better results than BM25 without further training on your data."
                  tagName="p"
                />
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
                  <EuiButton
                    color="success"
                    disabled={isCreateButtonDisabled}
                    iconType="launch"
                    onClick={() => createTextExpansionModel(undefined)}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCallOut.deployButton.label',
                      {
                        defaultMessage: 'Deploy',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink target="_blank" href={docLinks.elser}>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.learnMoreLink"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

export const ModelDeploymentInProgress = ({
  dismiss,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isDismissable'>) => (
  <EuiCallOut color="success">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon color="success" type="clock" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText color="success" size="xs">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingTitle',
                  { defaultMessage: 'Your ELSER model is deploying.' }
                )}
              </h3>
            </EuiText>
          </EuiFlexItem>
          {isDismissable && (
            <EuiFlexItem grow={false}>
              <TextExpansionDismissButton dismiss={dismiss} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingBody',
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

export const ModelDeployed = ({
  dismiss,
  isDismissable,
  isStartButtonDisabled,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isDismissable' | 'isStartButtonDisabled'>) => {
  const { startTextExpansionModel } = useActions(TextExpansionCalloutLogic);

  return (
    <EuiCallOut color="success">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon color="success" type="checkInCircleFilled" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText color="success" size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployedTitle',
                    { defaultMessage: 'Your ELSER model has deployed but not started.' }
                  )}
                </h3>
              </EuiText>
            </EuiFlexItem>
            {isDismissable && (
              <EuiFlexItem grow={false}>
                <TextExpansionDismissButton dismiss={dismiss} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployedBody',
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
                color="success"
                disabled={isStartButtonDisabled}
                iconType="playFilled"
                onClick={() => startTextExpansionModel(undefined)}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCallOut.startModelButton.label',
                  {
                    defaultMessage: 'Start single-threaded',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconSide="left"
                iconType="wrench"
                onClick={() =>
                  KibanaLogic.values.navigateToUrl('/app/ml/trained_models', {
                    shouldNotCreateHref: true,
                  })
                }
              >
                {i18n.translate('xpack.enterpriseSearch.content.engine.api.step1.viewKeysButton', {
                  defaultMessage: 'Fine-tune performance',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

export const ModelStarted = ({
  dismiss,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isDismissable'>) => (
  <EuiCallOut color="success">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText color="success" size="xs">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedTitle',
                  { defaultMessage: 'Your ELSER model has started.' }
                )}
              </h3>
            </EuiText>
          </EuiFlexItem>
          {isDismissable && (
            <EuiFlexItem grow={false}>
              <TextExpansionDismissButton dismiss={dismiss} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedBody',
              { defaultMessage: 'Enjoy the power of ELSER in your custom Inference pipeline.' }
            )}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);

export const TextExpansionCallOut: React.FC<TextExpansionCallOutProps> = (props) => {
  const { dismiss, isDismissable, show } = useTextExpansionCallOutData(props);
  const {
    createTextExpansionModelError,
    fetchTextExpansionModelError,
    isCreateButtonDisabled,
    isModelDownloadInProgress,
    isModelDownloaded,
    isModelStarted,
    isStartButtonDisabled,
    startTextExpansionModelError,
  } = useValues(TextExpansionCalloutLogic);

  // In case of an error, show the error callout only
  const error = getTextExpansionError(
    createTextExpansionModelError,
    fetchTextExpansionModelError,
    startTextExpansionModelError
  );
  if (error) return <TextExpansionErrors error={error} />;

  if (!show) return null;

  if (isModelDownloadInProgress) {
    return <ModelDeploymentInProgress dismiss={dismiss} isDismissable={isDismissable} />;
  } else if (isModelDownloaded) {
    return (
      <ModelDeployed
        dismiss={dismiss}
        isDismissable={isDismissable}
        isStartButtonDisabled={isStartButtonDisabled}
      />
    );
  } else if (isModelStarted) {
    return <ModelStarted dismiss={dismiss} isDismissable={isDismissable} />;
  }

  return (
    <DeployModel
      dismiss={dismiss}
      isDismissable={isDismissable}
      isCreateButtonDisabled={isCreateButtonDisabled}
    />
  );
};
