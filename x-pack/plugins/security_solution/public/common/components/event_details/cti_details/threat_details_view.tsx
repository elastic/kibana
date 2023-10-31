/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { groupBy } from 'lodash';

import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';
import type { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import * as i18n from './translations';
import { EnrichmentIcon } from './enrichment_icon';
import { EnrichmentAccordionGroup } from './enrichment_accordion_group';
import { EnrichmentNoData } from './enrichment_no_data';

const EnrichmentSectionHeader: React.FC<{ type?: ENRICHMENT_TYPES }> = ({ type }) => {
  return type ? (
    <>
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h3>
              {type === ENRICHMENT_TYPES.IndicatorMatchRule
                ? i18n.INDICATOR_ENRICHMENT_TITLE
                : i18n.INVESTIGATION_ENRICHMENT_TITLE}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EnrichmentIcon type={type} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  ) : null;
};

const EnrichmentSection: React.FC<{
  enrichments: CtiEnrichment[];
  type?: ENRICHMENT_TYPES;
  loading?: boolean;
  dataTestSubj: string;
  children?: React.ReactNode;
}> = ({ enrichments, type, loading, dataTestSubj, children }) => {
  return (
    <div data-test-subj={dataTestSubj}>
      <EnrichmentSectionHeader type={type} />
      {children}
      {Array.isArray(enrichments) ? (
        <EnrichmentAccordionGroup enrichments={enrichments} />
      ) : (
        <>
          <EnrichmentNoData type={type} />
          {loading && (
            <>
              <EuiSpacer size="m" />
              <EuiSkeletonText data-test-subj="loading-enrichments" lines={4} />
            </>
          )}
        </>
      )}
    </div>
  );
};

const ThreatDetailsViewComponent: React.FC<{
  enrichments: CtiEnrichment[];
  showInvestigationTimeEnrichments: boolean;
  loading: boolean;
  /**
   * Slot to render something before the beforeHeader.
   * NOTE: this was introduced to avoid alterting existing flyout and will be removed after
   * new flyout implementation is ready (Expandable Flyout owned by the Investigations Team)
   */
  before?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ enrichments, before = null, showInvestigationTimeEnrichments, loading, children }) => {
  const {
    [ENRICHMENT_TYPES.IndicatorMatchRule]: indicatorMatches,
    [ENRICHMENT_TYPES.InvestigationTime]: threatIntelEnrichments,
    undefined: matchesWithNoType,
  } = groupBy(enrichments, 'matched.type');

  return (
    <>
      {before}
      <EnrichmentSection
        dataTestSubj="threat-match-detected"
        enrichments={indicatorMatches}
        type={ENRICHMENT_TYPES.IndicatorMatchRule}
      />
      {showInvestigationTimeEnrichments && (
        <>
          <EuiHorizontalRule />
          <EnrichmentSection
            dataTestSubj="enriched-with-threat-intel"
            enrichments={threatIntelEnrichments}
            type={ENRICHMENT_TYPES.InvestigationTime}
            loading={loading}
          >
            {children}
          </EnrichmentSection>
        </>
      )}
      {matchesWithNoType && (
        <>
          <EuiHorizontalRule />
          {indicatorMatches && <EuiSpacer size="l" />}
          <EnrichmentSection enrichments={matchesWithNoType} dataTestSubj="matches-with-no-type" />
        </>
      )}
    </>
  );
};

export const ThreatDetailsView = React.memo(ThreatDetailsViewComponent);
