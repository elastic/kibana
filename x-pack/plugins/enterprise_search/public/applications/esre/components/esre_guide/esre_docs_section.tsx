/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';

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
                defaultMessage="To learn more about how to get started with ESRE, and test these tools with concrete examples, visit the {esreDocumentation}."
                values={{
                  esreDocumentation: (
                    <EuiLink
                      data-telemetry-id="entSearch-esre-documentation-esreHomeLink"
                      target="_blank"
                      href={docLinks.esre}
                      external
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.esre.esreDocsSection.description.esreLinkText',
                        {
                          defaultMessage: 'ESRE documentation',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
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
                      defaultMessage="These are complex subjects, so we've curated some {learningTopics} to help you get started."
                      values={{
                        learningTopics: (
                          <EuiLink
                            data-telemetry-id="entSearch-esre-documentation-esreLearnLink"
                            target="_blank"
                            href={docLinks.esreLearn}
                            external={false}
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.esre.esreDocsSection.learn.learningTopicsLinkText',
                              {
                                defaultMessage: 'learning topics',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
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
                      defaultMessage="Learn what ESRE is (and isn't) from these {frequentlyAskedQuestions}."
                      values={{
                        frequentlyAskedQuestions: (
                          <EuiLink
                            data-telemetry-id="entSearch-esre-documentation-esreFaqLink"
                            target="_blank"
                            href={docLinks.esreFaq}
                            external={false}
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.esre.esreDocsSection.learn.frequentlyAskedQuestionsLinkText',
                              {
                                defaultMessage: 'frequently asked questions',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
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
                      defaultMessage="Need help? Check out the {discussForum}!"
                      values={{
                        discussForum: (
                          <EuiLink
                            data-telemetry-id="entSearch-esre-documentation-esreHelpLink"
                            target="_blank"
                            href={docLinks.esreHelp}
                            external={false}
                          >
                            {i18n.translate(
                              'xpack.enterpriseSearch.esre.esreDocsSection.learn.discussForumLinkText',
                              {
                                defaultMessage: 'ESRE discuss forum',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
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
