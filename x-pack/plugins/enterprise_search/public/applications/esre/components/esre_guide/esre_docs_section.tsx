/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

export const EsreDocsSection: React.FC = () => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow={4}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.esre.esreDocsSection.title"
                defaultMessage="Dive deeper with the ESRE docs"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.esre.esreDocsSection.description"
                defaultMessage="To learn more about how to get started with ESRE, and test these tools with concrete examples, visit the ESRE documentation."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={6}>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.esre.esreDocsSection.learn.title"
                      defaultMessage="Learn"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.esre.esreDocsSection.learn.description"
                      defaultMessage="These are complex topics, so we've curated some learning topics to help you get started."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.esre.esreDocsSection.faq.title"
                      defaultMessage="FAQ"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.esre.esreDocsSection.faq.description"
                      defaultMessage="Learn what ESRE is (and isn't) from these frequently asked questions."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.esre.esreDocsSection.help.title"
                      defaultMessage="Help"
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.esre.esreDocsSection.help.description"
                      defaultMessage="Need help? Check out the ESRE discuss forum!"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
