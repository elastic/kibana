/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToggleAlertFlyoutButton } from '../components/overview/alerts/alerts_containers';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

const ADD_DATA_LABEL = i18n.translate('xpack.uptime.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

export const ActionMenu = () => {
  const kibana = useKibana();

  return (
    <EuiFlexGroup alignItems="flexEnd" responsive={false} style={{ paddingRight: 20 }}>
      <EuiFlexItem grow={false}>
        <ToggleAlertFlyoutButton />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          href={kibana.services?.application?.getUrlForApp('/home#/tutorial/uptimeMonitors')}
          color="primary"
          iconType="plusInCircle"
        >
          {ADD_DATA_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
