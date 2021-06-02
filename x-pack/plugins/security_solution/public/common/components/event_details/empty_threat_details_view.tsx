/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { useKibana } from '../../lib/kibana';

const EmptyThreatDetailsViewContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Span = styled.span`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  line-height: 1.8em;
  text-align: center;
  padding: ${({ theme }) => `${theme.eui.paddingSizes.m} ${theme.eui.paddingSizes.xl}`};
`;

const EmptyThreatDetailsViewComponent: React.FC<{}> = () => {
  const threatIntelDocsUrl = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;

  return (
    <EmptyThreatDetailsViewContainer data-test-subj="empty-threat-details-view">
      <EuiSpacer size="xxl" />
      <EuiTitle size="m">
        <h2>{i18n.NO_ENRICHMENT_FOUND}</h2>
      </EuiTitle>
      <Span>
        {i18n.IF_CTI_NOT_ENABLED}
        <EuiLink href={threatIntelDocsUrl} target="_blank">
          {i18n.CHECK_DOCS}
        </EuiLink>
      </Span>
    </EmptyThreatDetailsViewContainer>
  );
};

EmptyThreatDetailsViewComponent.displayName = 'EmptyThreatDetailsView';

export const EmptyThreatDetailsView = React.memo(EmptyThreatDetailsViewComponent);
