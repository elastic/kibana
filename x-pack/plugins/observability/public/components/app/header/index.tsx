/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import HeaderMenuPortal from '../../shared/header_menu_portal';

export * from './header_menu';
export * from './header_props';

export function ObservabilityHeader() {
  const { appMountParameters, core } = usePluginContext();
  const { setHeaderActionMenu } = appMountParameters;
  const { prepend } = core.http.basePath;

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>
      <EuiHeaderLinks>
        <EuiHeaderLink
          color="primary"
          href={prepend('/app/home#/tutorial_directory/logging')}
          iconType="indexOpen"
        >
          {i18n.translate('xpack.observability.home.addData', { defaultMessage: 'Add data' })}
        </EuiHeaderLink>
      </EuiHeaderLinks>
    </HeaderMenuPortal>
  );
}
