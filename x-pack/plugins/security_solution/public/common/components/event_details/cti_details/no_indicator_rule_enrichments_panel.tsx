/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { useKibana } from '../../../lib/kibana';
import * as i18n from './translations';

const Container = styled(EuiPanel)`
  display: flex;
  flex-direction: column;
`;

const NoIndicatorRuleEnrichmentsPanelFC: React.FC = () => {
  const threatIntelDocsUrl = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;

  return (
    <Container hasShadow={false} data-test-subj="no-indicator-rule-enrichments-panel">
      <EuiText textAlign="center">
        <h2>{i18n.NO_INDICATOR_ENRICHMENTS_TITLE}</h2>
      </EuiText>
      <EuiText size="s" color="subdued">
        {i18n.IF_CTI_NOT_ENABLED}
        <EuiLink href={threatIntelDocsUrl} target="_blank">
          {i18n.CHECK_DOCS}
        </EuiLink>
      </EuiText>
    </Container>
  );
};

NoIndicatorRuleEnrichmentsPanelFC.displayName = 'NoIndicatorRuleEnrichmentsPanel';

export const NoIndicatorRuleEnrichmentsPanel = React.memo(NoIndicatorRuleEnrichmentsPanelFC);
