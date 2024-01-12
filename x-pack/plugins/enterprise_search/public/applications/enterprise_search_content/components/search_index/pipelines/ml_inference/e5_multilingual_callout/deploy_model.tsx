/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedHTMLMessage, FormattedMessage } from '@kbn/i18n-react';

import { E5MultilingualCallOutState, E5MultilingualDismissButton } from './e5_multilingual_callout';
import { E5MultilingualCalloutLogic } from './e5_multilingual_callout_logic';

export const DeployModel = ({
  dismiss,
  ingestionMethod,
  isCreateButtonDisabled,
  isDismissable,
}: Pick<
  E5MultilingualCallOutState,
  'dismiss' | 'ingestionMethod' | 'isCreateButtonDisabled' | 'isDismissable'
>) => {
  const { createE5MultilingualModel } = useActions(E5MultilingualCalloutLogic);

  return (
    <EuiCallOut color="primary">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary">
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.titleBadge"
                  defaultMessage="New"
                />
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText color="primary" size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.title',
                    { defaultMessage: 'Improve your results with E5' }
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
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiText size="s">
                <FormattedHTMLMessage
                  id="xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.body"
                  defaultMessage="E5 (EmbEddings from bidirEctional Encoder rEpresentations) is an NLP model that enables you to perform multi-lingual semantic search by using dense vector representations. This model performs best for non-English language documents and queries."
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
                    color="primary"
                    data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-e5MultilingualCallOut-deployModel`}
                    disabled={isCreateButtonDisabled}
                    iconType="launch"
                    onClick={() => createE5MultilingualModel()}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualCallOut.deployButton.label',
                      {
                        defaultMessage: 'Deploy',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink
                    target="_blank"
                    href="https://www.elastic.co/search-labs/blog/articles/multilingual-vector-search-e5-embedding-model"
                  >
                    <FormattedMessage
                      id="xpack.enterpriseSearch.content.index.pipelines.e5MultilingualCallOut.learnMoreLink"
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
