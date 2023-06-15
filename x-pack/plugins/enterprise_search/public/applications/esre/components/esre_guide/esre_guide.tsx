/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { SetEsreChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchEsrePageTemplate } from '../layout/page_template';
import {
  EuiImage,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';

import analyticsIllustration from '../../../../assets/images/analytics.svg';
import scalableIllustration from '../../../../assets/images/scalable.svg';
import simplifyIllustration from '../../../../assets/images/simplify.svg';
import { SemanticSearchSection } from './semantic_search_section';
import { RankAggregationSection } from './rank_aggregation_section';
import { MeasurePerformanceSection } from './measure_performance_section';
import { EsreDocsSection } from './esre_docs_section';

export const EsreGuide: React.FC = () => {
  return (
    <EnterpriseSearchEsrePageTemplate
      restrictWidth
      bottomBorder={false}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.esre.guide.pageTitle', {
          defaultMessage: 'Enhance your search with ESRE',
        }),
      }}
    >
      <SetPageChrome />
      <EuiPanel color="transparent" paddingSize="none">
        <EuiFlexGroup justifyContent="spaceBetween" direction="column" responsive>
          <EuiFlexItem grow>
            <EuiPanel color="subdued" hasShadow={false}>
              <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiImage size="m" src={simplifyIllustration} alt="Simplify" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiImage size="m" src={analyticsIllustration} alt="Analytics" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiImage size="m" src={scalableIllustration} alt="Scalable" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.esre.guide.description"
                  defaultMessage="The Elasticsearch Relevance Engine™ (ESRE) enables developers to build AI search-powered applications using the Elastic platform. ESRE is a set of tools and features that include our proprietary trained ML model ELSER, our vector search and embeddings capabilities, and RRF ranking for combining vector and text search."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <SemanticSearchSection />
          </EuiFlexItem>
          <EuiHorizontalRule />
          <EuiFlexItem grow>
            <RankAggregationSection />
          </EuiFlexItem>
          <EuiHorizontalRule />
          <EuiFlexItem grow>
            <MeasurePerformanceSection />
          </EuiFlexItem>
          <EuiHorizontalRule />
          <EuiFlexItem grow>
            <EsreDocsSection />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EnterpriseSearchEsrePageTemplate>
  );
};
