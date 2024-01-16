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
import { FormattedMessage, FormattedHTMLMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../../shared/doc_links';

import { TextExpansionCallOutState, TextExpansionDismissButton } from './text_expansion_callout';
import { TextExpansionCalloutLogic } from './text_expansion_callout_logic';

export const DeployModel = ({
  dismiss,
  ingestionMethod,
  isCreateButtonDisabled,
  isDismissable,
}: Pick<
  TextExpansionCallOutState,
  'dismiss' | 'ingestionMethod' | 'isCreateButtonDisabled' | 'isDismissable'
>) => {
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
                  defaultMessage="ELSER (Elastic Learned Sparse EncodeR) is Elastic's NLP model for English semantic search, utilizing sparse vectors. It prioritizes intent and contextual meaning over literal term matching, optimized specifically for English documents and queries on the Elastic platform."
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
                    data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-textExpansionCallOut-deployModel`}
                    disabled={isCreateButtonDisabled}
                    iconType="launch"
                    onClick={() => createTextExpansionModel()}
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
