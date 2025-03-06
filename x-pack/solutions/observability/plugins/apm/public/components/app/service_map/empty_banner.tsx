/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink, useEuiTheme } from '@elastic/eui';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { CytoscapeContext } from './cytoscape';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

const EmptyBannerContainer = styled.div`
  margin: ${({ theme }) => theme.euiTheme.size.s};
  /* Add some extra margin so it displays to the right of the controls. */
  left: calc(${({ theme }) => theme.euiTheme.size.xxl} + ${({ theme }) => theme.euiTheme.size.s});
  position: absolute;
  z-index: 1;
`;

export function EmptyBanner() {
  const { euiTheme } = useEuiTheme();
  const cy = useContext(CytoscapeContext);
  const [nodeCount, setNodeCount] = useState(0);
  const { docLinks } = useApmPluginContext().core;

  useEffect(() => {
    const handler: cytoscape.EventHandler = (event) => setNodeCount(event.cy.nodes().length);

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
  const width = cy.width() - parseInt(euiTheme.size.xxl, 10) - parseInt(euiTheme.size.l, 10);

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
        <EuiLink
          data-test-subj="apmEmptyBannerLearnMoreInTheDocsLink"
          href={docLinks.links.apm.supportedServiceMaps}
        >
          {i18n.translate('xpack.apm.serviceMap.emptyBanner.docsLink', {
            defaultMessage: 'Learn more in the docs',
          })}
        </EuiLink>
      </EuiCallOut>
    </EmptyBannerContainer>
  );
}
