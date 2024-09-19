/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

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
      {type === ENRICHMENT_TYPES.IndicatorMatchRule
        ? i18n.NO_ENRICHMENTS_FOUND_DESCRIPTION
        : i18n.NO_INVESTIGATION_ENRICHMENTS_DESCRIPTION}
    </InlineBlock>
  );
};
