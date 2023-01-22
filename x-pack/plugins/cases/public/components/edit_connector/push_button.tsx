/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
import * as i18n from './translations';

interface PushButtonProps {
  isLoading: boolean;
  disabled: boolean;
  errorsMsg: ErrorMessage[];
  hasBeenPushed: boolean;
  showTooltip: boolean;
  connectorName: string;
  pushToService: () => Promise<void>;
}

const PushButtonComponent: React.FC<PushButtonProps> = ({
  disabled,
  errorsMsg,
  isLoading,
  hasBeenPushed,
  connectorName,
  showTooltip,
  pushToService,
}) => {
  const button = (
    <EuiButtonEmpty
      data-test-subj="push-to-external-service"
      iconType="importAction"
      onClick={pushToService}
      disabled={disabled}
      isLoading={isLoading}
    >
      {hasBeenPushed ? i18n.UPDATE_THIRD(connectorName) : i18n.PUSH_THIRD(connectorName)}
    </EuiButtonEmpty>
  );

  return showTooltip ? (
    <EuiToolTip
      position="top"
      title={errorsMsg.length > 0 ? errorsMsg[0].title : i18n.PUSH_LOCKED_TITLE(connectorName)}
      content={<p>{errorsMsg.length > 0 ? errorsMsg[0].description : i18n.PUSH_LOCKED_DESC}</p>}
    >
      {button}
    </EuiToolTip>
  ) : (
    <>{button}</>
  );
};

PushButtonComponent.displayName = 'PushButton';

export const PushButton = React.memo(PushButtonComponent);
