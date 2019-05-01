/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiConfirmModal,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiOverlayMask
} from '@elastic/eui';
import { CMListAPIResponse } from '../../../../server/lib/settings/cm/list_configurations';

type Config = CMListAPIResponse[0];

export function DeleteModal({
  configToBeDeleted,
  onCancel,
  onConfirm
}: {
  configToBeDeleted: Config | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (configToBeDeleted == null) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={`Delete config for '${configToBeDeleted.service.name}' ${
          configToBeDeleted.service.environment
            ? `(${configToBeDeleted.service.environment})`
            : '(no environment)'
        }`}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText="Cancel"
        confirmButtonText="Delete configuration"
        buttonColor="danger"
        defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      >
        <p>
          The sample rate will revert to the specified rate in the settings.yml
          once the configured agent(s) reach the server
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
}
