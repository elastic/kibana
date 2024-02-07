/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import elserIllustration from '../../../../assets/images/elser.svg';
import nlpEnrichmentIllustration from '../../../../assets/images/nlp.svg';
import vectorSearchIllustration from '../../../../assets/images/vector.svg';

import { AISearchGuideAccordion } from './ai_search_guide_accordion';
import { ElserPanel } from './elser_panel';
import { NlpEnrichmentPanel } from './nlp_enrichment_panel';
import { VectorSearchPanel } from './vector_search_panel';

export const SemanticSearchSection: React.FC = () => {
  const [currentExpandedId, setCurrentExpandedId] = useState<string | undefined>('elserAccordion');

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={4}>
        <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.aiSearch.semanticSearch.title"
                  defaultMessage="Set up semantic search"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.aiSearch.semanticSearch.description"
                  defaultMessage="Combine any of these information retrieval tools."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={6}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <AISearchGuideAccordion
              id="elserAccordion"
              data-telemetry-id="entSearch-aiSearch-semanticSearch-elserAccordion"
              initialIsOpen
              icon={elserIllustration}
              title={i18n.translate('xpack.enterpriseSearch.aiSearch.elserAccordion.title', {
                defaultMessage: 'Elastic Learned Sparse Encoder',
              })}
              description={i18n.translate(
                'xpack.enterpriseSearch.aiSearch.elserAccordion.description',
                {
                  defaultMessage: 'Instant semantic search capabilities',
                }
              )}
              currentExpandedId={currentExpandedId}
              onToggle={setCurrentExpandedId}
            >
              <ElserPanel />
            </AISearchGuideAccordion>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AISearchGuideAccordion
              id="vectorSearchAccordion"
              data-telemetry-id="entSearch-aiSearch-semanticSearch-vectorSearchAccordion"
              icon={vectorSearchIllustration}
              title={i18n.translate('xpack.enterpriseSearch.aiSearch.vectorSearchAccordion.title', {
                defaultMessage: 'Vector Search',
              })}
              description={i18n.translate(
                'xpack.enterpriseSearch.aiSearch.vectorSearchAccordion.description',
                {
                  defaultMessage: 'Powerful similarity searches for unstructured data',
                }
              )}
              currentExpandedId={currentExpandedId}
              onToggle={setCurrentExpandedId}
            >
              <VectorSearchPanel />
            </AISearchGuideAccordion>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AISearchGuideAccordion
              id="nlpEnrichmentAccordion"
              data-telemetry-id="entSearch-aiSearch-semanticSearch-nlpEnrichmentAccordion"
              icon={nlpEnrichmentIllustration}
              title={i18n.translate(
                'xpack.enterpriseSearch.aiSearch.nlpEnrichmentAccordion.title',
                {
                  defaultMessage: 'NLP Enrichment',
                }
              )}
              description={i18n.translate(
                'xpack.enterpriseSearch.aiSearch.nlpEnrichmentAccordion.description',
                {
                  defaultMessage: 'Insightful data enrichment with trained ML models',
                }
              )}
              currentExpandedId={currentExpandedId}
              onToggle={setCurrentExpandedId}
            >
              <NlpEnrichmentPanel />
            </AISearchGuideAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
