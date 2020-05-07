/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AlertType } from '../../../../../../common/alert_types';
import { AlertAdd } from '../../../../../../../triggers_actions_ui/public';

type AlertAddProps = React.ComponentProps<typeof AlertAdd>;

interface Props {
  addFlyoutVisible: AlertAddProps['addFlyoutVisible'];
  setAddFlyoutVisibility: AlertAddProps['setAddFlyoutVisibility'];
  alertType: AlertType | null;
}

export function AlertingFlyout(props: Props) {
  const { addFlyoutVisible, setAddFlyoutVisibility, alertType } = props;
  return (
    alertType && (
      <AlertAdd
        addFlyoutVisible={addFlyoutVisible}
        setAddFlyoutVisibility={setAddFlyoutVisibility}
        consumer="apm"
        alertTypeId={alertType}
        canChangeTrigger={false}
      />
    )
  );
}
