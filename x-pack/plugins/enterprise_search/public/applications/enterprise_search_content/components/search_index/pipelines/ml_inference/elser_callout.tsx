/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedHTMLMessage } from '@kbn/i18n-react';

import { MLInferenceLogic } from './ml_inference_logic';

export interface ELSERCallOutState {
  dismiss: () => void;
  dismissable: boolean;
  show: boolean;
}

export interface ELSERCallOutProps {
  dismissable?: boolean;
}

export const ELSER_CALL_OUT_DISMISSED_KEY = 'enterprise-search-elser-callout-dismissed';

export const useELSERCallOutData = ({
  dismissable = false,
}: ELSERCallOutProps): ELSERCallOutState => {
  const { supportedMLModels } = useValues(MLInferenceLogic);

  const doesNotHaveELSERModel = useMemo(() => {
    return !supportedMLModels.some((m) => m.inference_config?.text_expansion);
  }, [supportedMLModels]);

  const [show, setShow] = useState<boolean>(() => {
    if (!dismissable) return true;

    try {
      return localStorage.getItem(ELSER_CALL_OUT_DISMISSED_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ELSER_CALL_OUT_DISMISSED_KEY, JSON.stringify(!show));
    } catch {
      return;
    }
  }, [show]);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  return { dismiss, dismissable, show: doesNotHaveELSERModel && show };
};

export const ELSERCallOut: React.FC<ELSERCallOutProps> = (props) => {
  const { dismiss, dismissable, show } = useELSERCallOutData(props);

  if (!show) return null;

  return (
    <EuiPanel color="success">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.index.pipelines.elserCallOut.titleBadge"
                defaultMessage="New"
              />
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiTitle size="xs">
              <h4>
                <EuiText color="text">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.index.pipelines.elserCallOut.title"
                    defaultMessage="Improve your results with ELSER"
                  />
                </EuiText>
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          {dismissable && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.enterpriseSearch.content.index.pipelines.elserCallOut.dismissButton',
                  { defaultMessage: 'Dismiss ELSER call out' }
                )}
                iconType="cross"
                onClick={dismiss}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiFlexGroup direction="column">
          <EuiText>
            <FormattedHTMLMessage
              id="xpack.enterpriseSearch.content.index.pipelines.elserCallOut.body"
              defaultMessage="ELSER (Elastic Learned Sparse EncodeR) is our <strong>new trained machine learning model</strong> designed to efficiently utilize context in natural language queries. Usage of this model provides better results than BM25 without further training on your data."
              tagName="p"
            />
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
