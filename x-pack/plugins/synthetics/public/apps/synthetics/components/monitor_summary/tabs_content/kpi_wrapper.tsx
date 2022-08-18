/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/kibana-react-plugin/common';

export const KpiWrapper = euiStyled.div`
  & .euiLoadingSpinner {
    margin: ${({ theme }) => theme.eui.euiSizeS};
  }

  & .legacyMtrVis__container > div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
