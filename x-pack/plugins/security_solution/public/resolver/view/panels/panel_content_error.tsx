/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { Breadcrumbs } from './breadcrumbs';
import { useLinkProps } from '../use_link_props';

/**
 * Display an error in the panel when something goes wrong and give the user a way to "retreat" back to a default state.
 *
 * @param {function} pushToQueryparams A function to update the hash value in the URL to control panel state
 * @param {string} translatedErrorMessage The message to display in the panel when something goes wrong
 */
// eslint-disable-next-line react/display-name
export const PanelContentError = memo(function ({
  id,
  translatedErrorMessage,
}: {
  id: string;
  translatedErrorMessage: string;
}) {
  const nodesLinkNavProps = useLinkProps(id, { panelView: 'nodes' });

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
      },
    ];
  }, [nodesLinkNavProps]);
  return (
    <>
      <Breadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiText textAlign="center" data-test-subj="resolver:panel:error">
        {translatedErrorMessage}
      </EuiText>
      <EuiSpacer size="l" />

      <EuiButtonEmpty {...nodesLinkNavProps}>
        {i18n.translate('xpack.securitySolution.endpoint.resolver.panel.error.goBack', {
          defaultMessage: 'View all processes',
        })}
      </EuiButtonEmpty>
    </>
  );
});
