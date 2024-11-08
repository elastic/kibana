/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';

import { SLM_STATE } from '../../../../constants';
import { useServices } from '../../../../app_context';

interface Props {
  status: string;
}

export const SlmStatus: React.FunctionComponent<Props> = ({ status }) => {
  const { i18n } = useServices();

  const statusMap: any = {
    [SLM_STATE.RUNNING]: {
      icon: <EuiIcon color="success" type="dot" />,
      label: i18n.translate('xpack.snapshotRestore.slmstatus.runninglable', {
        defaultMessage: 'Running',
      }),
    },
    [SLM_STATE.STOPPING]: {
      icon: <EuiIcon color="warning" type="dot" />,
      label: i18n.translate('xpack.snapshotRestore.slmstatus.stoppinglable', {
        defaultMessage: 'Stopping',
      }),
    },
    [SLM_STATE.STOPPED]: {
      icon: <EuiIcon color="disabled" type="dot" />,
      label: i18n.translate('xpack.snapshotRestore.slmstatus.stoppedlable', {
        defaultMessage: 'Stopped',
      }),
    },
  };

  if (!statusMap[status]) {
    // Returns empty if no status
    return <></>;
  }

  const { icon, label } = statusMap[status];

  return (
    <>
      <EuiPanel hasBorder={true}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiFlexGroup>
                <FormattedMessage
                  id="xpack.snapshotRestore.slmstatus.title"
                  defaultMessage="SLM status: {slmStatus}"
                  values={{
                    slmStatus: (
                      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
                        <EuiFlexItem grow={false}>{label}</EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                  }}
                />
              </EuiFlexGroup>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer />
    </>
  );
};
