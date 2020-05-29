/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiFormRow,
} from '@elastic/eui';

import { CommonBaseAlert } from '../../../common/types';
import { AlertPopoverContext } from './lib';
import { Legacy } from '../../legacy_shims';
import { AlertPopoverConfigureDurationParam } from './configure_duration_param';

interface AlertPopoverConfigureThrottleProps {
  done: (alert: CommonBaseAlert) => void;
  cancel: () => void;
}
export const AlertPopoverConfigureThrottle: React.FC<AlertPopoverConfigureThrottleProps> = (
  props: AlertPopoverConfigureThrottleProps
) => {
  const { done, cancel } = props;
  const context = React.useContext(AlertPopoverContext);
  const [isSaving, setIsSaving] = React.useState(false);
  const [throttle, setThrottle] = React.useState(context.alert.rawAlert.throttle);

  async function save() {
    setIsSaving(true);
    let alert;
    try {
      alert = await Legacy.shims.kfetch({
        method: 'PUT',
        pathname: `/api/monitoring/v1/alert/${context.alert.type}`,
        body: JSON.stringify({
          throttle,
        }),
      });
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: 'Error saving throttle',
        text: err.message,
      });
    }
    setIsSaving(false);
    done(alert);
  }

  return (
    <EuiOverlayMask>
      <EuiModal onClose={cancel} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>Configure throttle</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow label="Notify me every">
            <AlertPopoverConfigureDurationParam
              name={'throttle'}
              duration={context.alert.rawAlert.throttle as string}
              setBody={(body: { throttle: string }) => setThrottle(body.throttle)}
            />
          </EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty size="s" onClick={cancel}>
            Cancel
          </EuiButtonEmpty>
          <EuiButton size="s" onClick={save} isDisabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
