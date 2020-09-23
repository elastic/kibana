/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { Breadcrumbs } from './breadcrumbs';
import { useLinkProps } from '../use_link_props';

export function PanelLoading() {
  const waitingString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.relatedDetail.wait',
    {
      defaultMessage: 'Waiting For Events...',
    }
  );
  const eventsString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.events',
    {
      defaultMessage: 'Events',
    }
  );
  const nodesLinkNavProps = useLinkProps({
    panelView: 'nodes',
  });
  const waitCrumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        ...nodesLinkNavProps,
      },
    ];
  }, [nodesLinkNavProps, eventsString]);
  return (
    <>
      <Breadcrumbs breadcrumbs={waitCrumbs} />
      <EuiSpacer size="l" />
      <EuiTitle>
        <h4>{waitingString}</h4>
      </EuiTitle>
    </>
  );
}
