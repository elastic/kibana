/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import * as i18n from './translations';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';

const InlineBlock = styled.div`
  display: inline-block;
  line-height: 1.7em;
`;

export const EnrichmentNoData: React.FC<{ type?: ENRICHMENT_TYPES }> = ({ type }) => {
  if (!type) return null;
  return (
    <InlineBlock data-test-subj="no-enrichments-found">
      {type === ENRICHMENT_TYPES.IndicatorMatchRule ? (
        i18n.NO_ENRICHMENTS_FOUND_DESCRIPTION
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.enrichment.noInvestigationEnrichment"
          defaultMessage="Additional threat intelligence wasn't found within the selected time frame. Try a different time frame, or {link} to collect threat intelligence for threat detection and matching."
          values={{
            link: (
              <EuiLink
                href="https://www.elastic.co/guide/en/security/current/es-threat-intel-integrations.html"
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.securitySolution.enrichment.investigationEnrichmentDocumentationLink"
                  defaultMessage="enable threat intelligence integrations"
                />
              </EuiLink>
            ),
          }}
        />
      )}
    </InlineBlock>
  );
};
