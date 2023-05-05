/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { CytoscapeContext } from './cytoscape';
import { useTheme } from '../../../hooks/use_theme';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

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
