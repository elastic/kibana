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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedHTMLMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';

import { useTextExpansionCallOutData } from './text_expansion_callout_data';
import { TextExpansionCalloutLogic } from './text_expansion_callout_logic';

export interface TextExpansionCallOutState {
  dismiss: () => void;
  isCreateButtonDisabled: boolean;
  isDismissable: boolean;
  show: boolean;
}

export interface TextExpansionCallOutProps {
  isDismissable?: boolean;
}

export const TextExpansionDismissButton = ({
  dismiss,
}: Pick<TextExpansionCallOutState, 'dismiss'>) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.dismissButton',
          { defaultMessage: 'Dismiss ELSER call out' }
        )}
        iconType="cross"
        onClick={dismiss}
      />
    </EuiFlexItem>
  );
};

export const DeployModel = ({
  dismiss,
  isCreateButtonDisabled,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isCreateButtonDisabled' | 'isDismissable'>) => {
  const { createTextExpansionModel } = useActions(TextExpansionCalloutLogic);

  return (
    <EuiPanel color="success">
      <EuiFlexGroup direction="column" gutterSize="s">
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
            <EuiTitle size="xs">
              <h4>
                <EuiText color="text">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.title"
                    defaultMessage="Improve your results with ELSER"
                  />
                </EuiText>
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          {isDismissable && (
            <EuiFlexItem grow={false}>
              <TextExpansionDismissButton dismiss={dismiss} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiFlexGroup direction="column">
          <EuiText>
            <FormattedHTMLMessage
              id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.body"
              defaultMessage="ELSER (Elastic Learned Sparse EncodeR) is our <strong>new trained machine learning model</strong> designed to efficiently use context in natural language queries. This model delivers better results than BM25 without further training on your data."
              tagName="p"
            />
          </EuiText>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiButton
              color="success"
              disabled={isCreateButtonDisabled}
              iconType="launch"
              onClick={() => createTextExpansionModel(undefined)}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.fields.addMapping',
                {
                  defaultMessage: 'Deploy',
                }
              )}
            </EuiButton>
            <EuiLink target="_blank" href={docLinks.elser}>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.learnMoreLink"
                defaultMessage="Learn more"
              />
            </EuiLink>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const ModelDeploymentInProgress = ({
  dismiss,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isDismissable'>) => (
  <EuiPanel color="success">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="clock" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiTitle size="xs">
              <h4>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingTitle"
                  defaultMessage="Your ELSER model is deploying."
                />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          {isDismissable && (
            <EuiFlexItem grow={false}>
              <TextExpansionDismissButton dismiss={dismiss} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText>
          <FormattedMessage
            id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployingBody"
            defaultMessage="You can continue creating your pipeline with other uploaded models in the meantime."
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

export const ModelDeployed = ({
  dismiss,
  isDismissable,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'isDismissable'>) => (
  <EuiPanel color="success">
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiTitle size="xs">
              <h4>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployedTitle"
                  defaultMessage="Your ELSER model has deployed."
                />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          {isDismissable && (
            <EuiFlexItem grow={false}>
              <TextExpansionDismissButton dismiss={dismiss} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiText>
          <FormattedMessage
            id="xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployedBody"
            defaultMessage="Enjoy the power of ELSER in your custom Inference pipeline."
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

export const TextExpansionCallOut: React.FC<TextExpansionCallOutProps> = (props) => {
  const { dismiss, isDismissable, show } = useTextExpansionCallOutData(props);
  const { isCreateButtonDisabled, isModelDownloadInProgress, isModelDownloaded } =
    useValues(TextExpansionCalloutLogic);

  if (!show) return null;

  if (!!isModelDownloadInProgress) {
    return <ModelDeploymentInProgress dismiss={dismiss} isDismissable={isDismissable} />;
  } else if (!!isModelDownloaded) {
    return <ModelDeployed dismiss={dismiss} isDismissable={isDismissable} />;
  }

  return (
    <DeployModel
      dismiss={dismiss}
      isDismissable={isDismissable}
      isCreateButtonDisabled={isCreateButtonDisabled}
    />
  );
};
