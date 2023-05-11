/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/kibana-react-plugin/common';

const EmptyBannerContainer = euiStyled.div`
  margin: ${({ theme }) => theme.eui.euiSizeS};
  /* Add some extra margin so it displays to the right of the controls. */
  left: calc(
    ${({ theme }) => theme.eui.euiSizeXXL} +
      ${({ theme }) => theme.eui.euiSizeS}
  );
  position: absolute;
  z-index: 1;
`;

export function EmptyBanner() {
  return null;
}
