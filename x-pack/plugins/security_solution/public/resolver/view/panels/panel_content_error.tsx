/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigateOrReplace } from '../use_navigate_or_replace';
import * as selectors from '../../store/selectors';
import { ResolverState } from '../../types';
import { StyledBreadcrumbs } from './panel_content_utilities';

/**
 * Display an error in the panel when something goes wrong and give the user a way to "retreat" back to a default state.
 *
 * @param {function} pushToQueryparams A function to update the hash value in the URL to control panel state
 * @param {string} translatedErrorMessage The message to display in the panel when something goes wrong
 */
export const PanelContentError = memo(function ({
  translatedErrorMessage,
}: {
  translatedErrorMessage: string;
}) {
  const nodesHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({ panelView: 'nodes' })
  );
  const nodesLinkNavProps = useNavigateOrReplace({
    search: nodesHref,
  });
  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.securitySolution.endpoint.resolver.panel.error.events', {
          defaultMessage: 'Events',
        }),
        ...nodesLinkNavProps,
      },
      {
        text: i18n.translate('xpack.securitySolution.endpoint.resolver.panel.error.error', {
          defaultMessage: 'Error',
        }),
        onClick: () => {},
      },
    ];
  }, [nodesLinkNavProps]);
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiText textAlign="center">{translatedErrorMessage}</EuiText>
      <EuiSpacer size="l" />
      <EuiButtonEmpty {...nodesLinkNavProps}>
        {i18n.translate('xpack.securitySolution.endpoint.resolver.panel.error.goBack', {
          defaultMessage: 'Click this link to return to the list of all processes.',
        })}
      </EuiButtonEmpty>
    </>
  );
});
