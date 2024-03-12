/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { useKibana } from '../../../../utils/kibana_react';
import HeaderMenuPortal from './header_menu_portal';

export function HeaderMenu(): React.ReactElement | null {
  const { http, theme } = useKibana().services;

  const { appMountParameters } = usePluginContext();

  return (
    <HeaderMenuPortal
      setHeaderActionMenu={appMountParameters?.setHeaderActionMenu!}
      theme$={theme.theme$}
    >
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <EuiHeaderLinks>
            <EuiHeaderLink
              color="primary"
              href={http.basePath.prepend('/app/integrations/browse')}
              iconType="indexOpen"
            >
              {i18n.translate('xpack.observability.home.addData', {
                defaultMessage: 'Add integrations',
              })}
            </EuiHeaderLink>
          </EuiHeaderLinks>
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}
