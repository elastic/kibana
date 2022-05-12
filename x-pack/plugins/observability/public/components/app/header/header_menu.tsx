/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityAppServices } from '../../../application/types';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import HeaderMenuPortal from '../../shared/header_menu_portal';

export function ObservabilityHeaderMenu(): React.ReactElement | null {
  const {
    appMountParameters: { setHeaderActionMenu },
  } = usePluginContext();

  const { http, theme } = useKibana<ObservabilityAppServices>().services;

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme.theme$}>
      <EuiHeaderLinks>
        <EuiHeaderLink
          color="primary"
          href={http.basePath.prepend('/app/integrations/browse')}
          iconType="indexOpen"
        >
          {addDataLinkText}
        </EuiHeaderLink>
      </EuiHeaderLinks>
    </HeaderMenuPortal>
  );
}

const addDataLinkText = i18n.translate('xpack.observability.home.addData', {
  defaultMessage: 'Add integrations',
});
