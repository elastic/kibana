/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import * as selectors from '../../store/selectors';
import { StyledBreadcrumbs } from './panel_content_utilities';
import { useNavigateOrReplace } from '../use_navigate_or_replace';
import { ResolverState } from '../../types';

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
  const nodesHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({ panelView: 'nodes' })
  );
  const nodesLinkNavProps = useNavigateOrReplace({
    search: nodesHref,
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
      <StyledBreadcrumbs breadcrumbs={waitCrumbs} />
      <EuiSpacer size="l" />
      <EuiTitle>
        <h4>{waitingString}</h4>
      </EuiTitle>
    </>
  );
}
