/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { EnrichmentRangePicker, RangeCallback } from './enrichment_range_picker';

import * as i18n from './translations';

const Container = styled(EuiPanel)`
  display: flex;
  flex-direction: column;
`;

const NoInvestigationEnrichmentsPanelFC: React.FC<{ onRangeChange: RangeCallback }> = ({
  onRangeChange,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const handleSearchClick = useCallback(() => setShowPicker((show) => !show), []);

  return (
    <Container hasShadow={false} data-test-subj="no-investigation-enrichments-panel">
      <EuiText textAlign="center">
        <h2>{i18n.NO_INVESTIGATION_ENRICHMENTS_FOUND}</h2>
      </EuiText>
      <EuiText size="s" color="subdued">
        {i18n.NO_INVESTIGATION_ENRICHMENTS_EXPLANATION}
        <EuiLink
          data-test-subj="change-enrichment-lookback-query-button"
          onClick={handleSearchClick}
        >
          {i18n.CHANGE_ENRICHMENT_LOOKBACK}
        </EuiLink>
      </EuiText>
      {showPicker && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="center">
            <EnrichmentRangePicker onChange={onRangeChange} />
          </EuiFlexGroup>
        </>
      )}
    </Container>
  );
};

NoInvestigationEnrichmentsPanelFC.displayName = 'NoInvestigationEnrichmentsPanelFC';

export const NoInvestigationEnrichmentsPanel = React.memo(NoInvestigationEnrichmentsPanelFC);
