/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import styled from 'styled-components';

import { useKibana } from '../../../lib/kibana';
import * as i18n from './translations';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';

const InlineBlock = styled.div`
  display: inline-block;
  line-height: 1.7em;
`;

const NoIntelligenceCTA: React.FC<{}> = () => {
  const threatIntelDocsUrl = `${
    useKibana().services.docLinks.links.filebeat.base
  }/filebeat-module-threatintel.html`;
  return (
    <>
      <span>{i18n.INDICATOR_TOOLTIP_CONTENT}</span>
      <span>{i18n.IF_CTI_NOT_ENABLED}</span>
      <span>
        <EuiLink href={threatIntelDocsUrl} target="_blank">
          {i18n.CHECK_DOCS}
        </EuiLink>
      </span>
      {'.'}
    </>
  );
};

export const EnrichmentNoData: React.FC<{ type?: ENRICHMENT_TYPES }> = ({ type }) => {
  if (!type) return null;
  return (
    <InlineBlock data-test-subj="no-enrichments-found">
      {type === ENRICHMENT_TYPES.IndicatorMatchRule ? (
        <NoIntelligenceCTA />
      ) : (
        i18n.NO_INVESTIGATION_ENRICHMENTS_DESCRIPTION
      )}
    </InlineBlock>
  );
};
