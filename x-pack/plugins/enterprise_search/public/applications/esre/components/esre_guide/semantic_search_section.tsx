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

import { ElserPanel } from './elser_panel';
import { EsreGuideAccordion } from './esre_guide_accordion';
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
                  id="xpack.enterpriseSearch.esre.semanticSearch.title"
                  defaultMessage="Set up semantic search"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.esre.semanticSearch.description"
                  defaultMessage="ESRE combines your choice of these information retrieval tools."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={6}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EsreGuideAccordion
              id="elserAccordion"
              data-telemetry-id="entSearch-esre-semanticSearch-elserAccordion"
              initialIsOpen
              icon={elserIllustration}
              title={i18n.translate('xpack.enterpriseSearch.esre.elserAccordion.title', {
                defaultMessage: 'Elastic Learned Sparse Encoder',
              })}
              description={i18n.translate(
                'xpack.enterpriseSearch.esre.elserAccordion.description',
                {
                  defaultMessage: 'Instant semantic search capabilities',
                }
              )}
              currentExpandedId={currentExpandedId}
              onToggle={setCurrentExpandedId}
            >
              <ElserPanel />
            </EsreGuideAccordion>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EsreGuideAccordion
              id="vectorSearchAccordion"
              data-telemetry-id="entSearch-esre-semanticSearch-vectorSearchAccordion"
              icon={vectorSearchIllustration}
              title={i18n.translate('xpack.enterpriseSearch.esre.vectorSearchAccordion.title', {
                defaultMessage: 'Vector Search',
              })}
              description={i18n.translate(
                'xpack.enterpriseSearch.esre.vectorSearchAccordion.description',
                {
                  defaultMessage: 'Powerful similarity searches for unstructured data',
                }
              )}
              currentExpandedId={currentExpandedId}
              onToggle={setCurrentExpandedId}
            >
              <VectorSearchPanel />
            </EsreGuideAccordion>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EsreGuideAccordion
              id="nlpEnrichmentAccordion"
              data-telemetry-id="entSearch-esre-semanticSearch-nlpEnrichmentAccordion"
              icon={nlpEnrichmentIllustration}
              title={i18n.translate('xpack.enterpriseSearch.esre.nlpEnrichmentAccordion.title', {
                defaultMessage: 'NLP Enrichment',
              })}
              description={i18n.translate(
                'xpack.enterpriseSearch.esre.nlpEnrichmentAccordion.description',
                {
                  defaultMessage: 'Insightful data enrichment with trained ML models',
                }
              )}
              currentExpandedId={currentExpandedId}
              onToggle={setCurrentExpandedId}
            >
              <NlpEnrichmentPanel />
            </EsreGuideAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
