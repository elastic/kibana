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
  margin: ${({ theme }) => theme.eui.gutterTypes.gutterSmall};
  /* Add some extra margin so it displays to the right of the controls. */
  left: calc(
    ${({ theme }) => theme.eui.gutterTypes.gutterExtraLarge} +
      ${({ theme }) => theme.eui.gutterTypes.gutterSmall}
  );
  position: absolute;
  z-index: 1;
`;

export function EmptyBanner() {
  const theme = useTheme();
  const cy = useContext(CytoscapeContext);
  const [nodeCount, setNodeCount] = useState(0);
  const { docLinks } = useApmPluginContext().core;

  useEffect(() => {
    const handler: cytoscape.EventHandler = (event) =>
      setNodeCount(event.cy.nodes().length);

    if (cy) {
      cy.on('add remove', 'node', handler);
    }

    return () => {
      if (cy) {
        cy.removeListener('add remove', 'node', handler);
      }
    };
  }, [cy]);

  // Only show if there's a single node.
  if (!cy || nodeCount !== 1) {
    return null;
  }

  // Since we're absolutely positioned, we need to get the full width and
  // subtract the space for controls and margins.
  const width =
    cy.width() -
    parseInt(theme.eui.gutterTypes.gutterExtraLarge, 10) -
    parseInt(theme.eui.gutterTypes.gutterLarge, 10);

  return (
    <EmptyBannerContainer style={{ width }}>
      <EuiCallOut
        title={i18n.translate('xpack.apm.serviceMap.emptyBanner.title', {
          defaultMessage: "Looks like there's only a single service.",
        })}
      >
        {i18n.translate('xpack.apm.serviceMap.emptyBanner.message', {
          defaultMessage:
            "We will map out connected services and external requests if we can detect them. Please make sure you're running the latest version of the APM agent.",
        })}{' '}
        <EuiLink href={docLinks.links.apm.supportedServiceMaps}>
          {i18n.translate('xpack.apm.serviceMap.emptyBanner.docsLink', {
            defaultMessage: 'Learn more in the docs',
          })}
        </EuiLink>
      </EuiCallOut>
    </EmptyBannerContainer>
  );
}
