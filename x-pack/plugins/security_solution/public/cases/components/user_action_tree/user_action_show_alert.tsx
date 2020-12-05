/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Signal } from '../../../../server/lib/detection_engine/signals/types';

import * as i18n from './translations';

interface UserActionShowAlertProps {
  id: string;
  alert: Signal;
  onShowAlertDetails: (alertId: string, index: string) => void;
}

const UserActionShowAlertComponent = ({
  id,
  alert,
  onShowAlertDetails,
}: UserActionShowAlertProps) => {
  const onClick = useCallback(() => onShowAlertDetails(alert.rule.id, alert.rule.output_index), [
    alert.rule.id,
    alert.rule.output_index,
    onShowAlertDetails,
  ]);
  return (
    <EuiToolTip position="top" content={<p>{i18n.SHOW_ALERT_TOOLTIP}</p>}>
      <EuiButtonIcon
        aria-label={i18n.SHOW_ALERT_TOOLTIP}
        data-test-subj={`comment-action-show-alert-${id}`}
        onClick={onClick}
        iconType="arrowRight"
        id={`${id}-show-alert`}
      />
    </EuiToolTip>
  );
};

export const UserActionShowAlert = memo(
  UserActionShowAlertComponent,
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    deepEqual(prevProps.alert, nextProps.alert) &&
    prevProps.onShowAlertDetails === nextProps.onShowAlertDetails
);
