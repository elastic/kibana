/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

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

import { MLInferenceLogic } from './ml_inference_logic';
import { TextExpansionCalloutLogic } from './text_expansion_callout_logic';
import { CreateTextExpansionModelResponse } from '../../../../api/ml_models/text_expansion/create_text_expansion_model_api_logic';

export interface TextExpansionCallOutState {
  createTextExpansionModel: (args: undefined) => CreateTextExpansionModelResponse | undefined;
  dismiss: () => void;
  dismissable: boolean;
  isCreateButtonDisabled: boolean;
  show: boolean;
}

export interface TextExpansionCallOutProps {
  dismissable?: boolean;
}

export const TEXT_EXPANSION_CALL_OUT_DISMISSED_KEY =
  'enterprise-search-text-expansion-callout-dismissed';

export const useTextExpansionCallOutData = ({
  dismissable = false,
}: TextExpansionCallOutProps): TextExpansionCallOutState => {
  const { supportedMLModels } = useValues(MLInferenceLogic);
  const { isCreateButtonDisabled } = useValues(TextExpansionCalloutLogic);
  const { createTextExpansionModel } = useActions(TextExpansionCalloutLogic);

  const doesNotHaveTextExpansionModel = useMemo(() => {
    return !supportedMLModels.some((m) => m.inference_config?.text_expansion);
  }, [supportedMLModels]);

  const [show, setShow] = useState<boolean>(() => {
    if (!dismissable) return true;

    try {
      return localStorage.getItem(TEXT_EXPANSION_CALL_OUT_DISMISSED_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_EXPANSION_CALL_OUT_DISMISSED_KEY, JSON.stringify(!show));
    } catch {
      return;
    }
  }, [show]);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  return {
    createTextExpansionModel,
    dismiss,
    dismissable,
    isCreateButtonDisabled,
    show: doesNotHaveTextExpansionModel && show,
  };
};

const TextExpansionDismissButton = ({ dismiss }: Pick<TextExpansionCallOutState, 'dismiss'>) => {
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

const DeployModel = ({
  createTextExpansionModel,
  dismissable,
  dismiss,
  isCreateButtonDisabled,
}: Pick<
  TextExpansionCallOutState,
  'createTextExpansionModel' | 'dismiss' | 'dismissable' | 'isCreateButtonDisabled'
>) => (
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
        {dismissable && (
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

const ModelDownloadInProgress = ({
  dismissable,
  dismiss,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'dismissable'>) => (
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
          {dismissable && (
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

const ModelDownloaded = ({
  dismissable,
  dismiss,
}: Pick<TextExpansionCallOutState, 'dismiss' | 'dismissable'>) => (
  <EuiPanel color="success">
    <EuiFlexGroup direction="column" gutterSize="s">
      {dismissable && (
        <EuiFlexItem grow={false}>
          <TextExpansionDismissButton dismiss={dismiss} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </EuiPanel>
);

export const TextExpansionCallOut: React.FC<TextExpansionCallOutProps> = (props) => {
  const { dismiss, dismissable, show } = useTextExpansionCallOutData(props);
  const { createTextExpansionModel } = useActions(TextExpansionCalloutLogic);
  const { isCreateButtonDisabled, isModelDownloadInProgress, isModelDownloaded } =
    useValues(TextExpansionCalloutLogic);

  // useEffect(() => {
  //   fetchTextExpansionModel(undefined);
  // }, [isModelDownloadInProgress]);

  if (!show) return null;

  console.log(
    'isModelDownloadInProgress',
    isModelDownloadInProgress,
    'isModelDownloaded',
    isModelDownloaded
  );
  if (!!isModelDownloadInProgress) {
    return <ModelDownloadInProgress dismiss={dismiss} dismissable={dismissable} />;
  } else if (!!isModelDownloaded) {
    return <ModelDownloaded dismiss={dismiss} dismissable={dismissable} />;
  }

  return (
    <DeployModel
      createTextExpansionModel={createTextExpansionModel}
      dismiss={dismiss}
      dismissable={dismissable}
      isCreateButtonDisabled={isCreateButtonDisabled}
    />
  );
};
