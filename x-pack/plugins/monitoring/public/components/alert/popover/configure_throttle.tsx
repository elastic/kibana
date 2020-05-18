/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
} from '@elastic/eui';

import { CommonBaseAlert } from '../../../../common/types';
import { AlertPopoverContext } from '../lib/context';
import { Legacy } from '../../../legacy_shims';
import { getTimeUnitLabel, TIME_UNITS } from '../../../../../triggers_actions_ui/public';

const parseRegex = /(\d+)(\w+)/;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AlertPopoverConfigureThrottleProps {
  done: (alert: CommonBaseAlert) => void;
  cancel: () => void;
}
export const AlertPopoverConfigureThrottle: React.FC<AlertPopoverConfigureThrottleProps> = (
  props: AlertPopoverConfigureThrottleProps
) => {
  const { done, cancel } = props;
  const context = React.useContext(AlertPopoverContext);
  const parsed = parseRegex.exec(context.alert.rawAlert.throttle || '');
  const defaultThrottleValue = parsed && parsed[1] ? parseInt(parsed[1], 10) : 1;
  const defaultThrottleUnit = parsed && parsed[2] ? parsed[2] : TIME_UNITS.MINUTE;
  const [throttleValue, setThrottleValue] = React.useState(defaultThrottleValue);
  const [throttleUnit, setThrottleUnit] = React.useState(defaultThrottleUnit);
  const [isSaving, setIsSaving] = React.useState(false);

  const timeUnits = Object.values(TIME_UNITS).map(value => ({
    value,
    text: getTimeUnitLabel(value),
  }));

  async function save() {
    setIsSaving(true);
    let alert;
    try {
      alert = await Legacy.shims.kfetch({
        method: 'PUT',
        pathname: `/api/monitoring/v1/alert/${context.alert.type}`,
        body: JSON.stringify({
          throttle: `${throttleValue}${throttleUnit}`,
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
            <EuiFlexGroup>
              <EuiFlexItem grow={2}>
                <EuiFieldNumber
                  compressed
                  value={throttleValue}
                  onChange={e => setThrottleValue(parseInt(e.target.value, 10))}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={4}>
                <EuiSelect
                  compressed
                  value={throttleUnit}
                  onChange={e => setThrottleUnit(e.target.value)}
                  options={timeUnits}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
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
