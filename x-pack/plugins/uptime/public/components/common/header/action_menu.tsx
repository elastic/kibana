/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { HeaderMenuPortal } from '../../../../../observability/public';
import { AppMountParameters } from '../../../../../../../src/core/public';
import { ToggleAlertFlyoutButton } from '../../overview/alerts/alerts_containers';

const ADD_DATA_LABEL = i18n.translate('xpack.uptime.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

export const ActionMenu = ({ appMountParameters }: { appMountParameters: AppMountParameters }) => {
  const kibana = useKibana();

  return (
    <HeaderMenuPortal setHeaderActionMenu={appMountParameters.setHeaderActionMenu}>
      <EuiFlexGroup alignItems="flexEnd" responsive={false} style={{ paddingRight: 20 }}>
        <EuiFlexItem grow={false}>
          <ToggleAlertFlyoutButton />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={kibana.services?.application?.getUrlForApp('/home#/tutorial/uptimeMonitors')}
            color="primary"
            iconType="indexOpen"
          >
            {ADD_DATA_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
};
