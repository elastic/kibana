/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiLink, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { useKibana } from '../../../lib/kibana';

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

export const NoEnrichmentsPanel: React.FC<{
  isIndicatorMatchesPresent: boolean;
  isInvestigationTimeEnrichmentsPresent: boolean;
}> = ({ isIndicatorMatchesPresent, isInvestigationTimeEnrichmentsPresent }) => {
  const threatIntelDocsUrl = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;
  const noIntelligenceCTA = (
    <>
      {i18n.IF_CTI_NOT_ENABLED}
      <EuiLink href={threatIntelDocsUrl} target="_blank">
        {i18n.CHECK_DOCS}
      </EuiLink>
    </>
  );

  if (!isIndicatorMatchesPresent && !isInvestigationTimeEnrichmentsPresent) {
    return (
      <NoEnrichmentsPanelView
        title={<h2>{i18n.NO_ENRICHMENTS_FOUND_TITLE}</h2>}
        description={
          <p>
            {i18n.NO_ENRICHMENTS_FOUND_DESCRIPTION} {noIntelligenceCTA}
          </p>
        }
      />
    );
  } else if (!isIndicatorMatchesPresent) {
    return (
      <>
        <EuiHorizontalRule margin="s" />
        <NoEnrichmentsPanelView
          title={<h2>{i18n.NO_INDICATOR_ENRICHMENTS_TITLE}</h2>}
          description={
            <p>
              {i18n.NO_INDICATOR_ENRICHMENTS_DESCRIPTION} {noIntelligenceCTA}
            </p>
          }
        />
      </>
    );
  } else if (!isInvestigationTimeEnrichmentsPresent) {
    return (
      <>
        <EuiHorizontalRule margin="s" />
        <NoEnrichmentsPanelView
          title={<h2>{i18n.NO_INVESTIGATION_ENRICHMENTS_TITLE}</h2>}
          description={
            <p>
              {i18n.NO_INVESTIGATION_ENRICHMENTS_DESCRIPTION} {noIntelligenceCTA}
            </p>
          }
        />
      </>
    );
  } else {
    return null;
  }
};
