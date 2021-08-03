/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiFlexGroup, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useKibana } from '../../../lib/kibana';
import { EnrichmentRangePicker, RangeCallback } from './enrichment_range_picker';

import * as i18n from './translations';

const Container = styled(EuiPanel)`
  display: flex;
  flex-direction: column;
`;

const NoEnrichmentsPanelView: React.FC<{
  title: React.ReactNode;
  description: React.ReactNode;
}> = ({ title, description }) => {
  return (
    <Container hasShadow={false} data-test-subj="no-enrichments-panel">
      <EuiText textAlign="center">{title}</EuiText>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        {description}
      </EuiText>
    </Container>
  );
};
NoEnrichmentsPanelView.displayName = 'NoEnrichmentsPanelView';

const NoIntelligenceCTA: React.FC<{}> = () => {
  const threatIntelDocsUrl = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;
  return (
    <>
      {i18n.IF_CTI_NOT_ENABLED}
      <EuiLink href={threatIntelDocsUrl} target="_blank">
        {i18n.CHECK_DOCS}
      </EuiLink>
    </>
  );
};
NoIntelligenceCTA.displayName = 'NoIntelligenceCTA';

const RangeFilter: React.FC<{ onRangeChange: RangeCallback }> = ({ onRangeChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const handleSearchClick = useCallback(() => setShowPicker((show) => !show), []);

  return (
    <>
      <EuiSpacer size="l" />
      {showPicker && (
        <EuiFlexGroup justifyContent="center">
          <EnrichmentRangePicker onChange={onRangeChange} />
        </EuiFlexGroup>
      )}
      <EuiLink data-test-subj="change-enrichment-lookback-query-button" onClick={handleSearchClick}>
        {i18n.CHANGE_ENRICHMENT_LOOKBACK}
      </EuiLink>
    </>
  );
};

const getTitleAndDescription = (
  isIndicatorMatchesPresent: boolean,
  isInvestigationTimeEnrichmentsPresent: boolean
) => {
  let title;
  let description;
  if (!isIndicatorMatchesPresent && !isInvestigationTimeEnrichmentsPresent) {
    title = i18n.NO_ENRICHMENTS_FOUND_TITLE;
    description = i18n.NO_ENRICHMENTS_FOUND_DESCRIPTION;
  } else if (!isIndicatorMatchesPresent) {
    title = i18n.NO_INDICATOR_ENRICHMENTS_TITLE;
    description = i18n.NO_INDICATOR_ENRICHMENTS_DESCRIPTION;
  } else {
    title = i18n.NO_INVESTIGATION_ENRICHMENTS_TITLE;
    description = i18n.NO_INVESTIGATION_ENRICHMENTS_DESCRIPTION;
  }
  return { title, description };
};

export const NoEnrichmentsPanel: React.FC<{
  isIndicatorMatchesPresent: boolean;
  isInvestigationTimeEnrichmentsPresent: boolean;
  onRangeChange: RangeCallback;
}> = ({ isIndicatorMatchesPresent, isInvestigationTimeEnrichmentsPresent, onRangeChange }) => {
  if (isIndicatorMatchesPresent && isInvestigationTimeEnrichmentsPresent) return null;

  const { title, description } = getTitleAndDescription(
    isIndicatorMatchesPresent,
    isInvestigationTimeEnrichmentsPresent
  );

  return (
    <Container hasShadow={false} data-test-subj="no-enrichments-panel">
      {!isInvestigationTimeEnrichmentsPresent && <RangeFilter onRangeChange={onRangeChange} />}
      <EuiText textAlign="center">
        <h2>{title}</h2>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <p>
          {description}
          <NoIntelligenceCTA />
        </p>
      </EuiText>
    </Container>
  );
};
