/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useMessagesStorage } from '../../../../common/containers/local_storage/use_messages_storage';

import * as i18n from './translations';

const MESSAGE_PLUGIN = 'security-detections';
const MESSAGE_ID = 'dismiss-ReadOnlyCallOut';

const ReadOnlyCallOutComponent = () => {
  const { addMessage, hasMessage } = useMessagesStorage();

  const wasDismissed = useMemo<boolean>(() => hasMessage(MESSAGE_PLUGIN, MESSAGE_ID), [hasMessage]);

  const [isVisible, setIsVisible] = useState<boolean>(!wasDismissed);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    addMessage(MESSAGE_PLUGIN, MESSAGE_ID);
  }, [setIsVisible, addMessage]);

  return isVisible ? (
    <EuiCallOut title={i18n.READ_ONLY_CALLOUT_TITLE} iconType="iInCircle">
      <p>{i18n.READ_ONLY_CALLOUT_MSG}</p>
      <EuiButton onClick={dismiss}>{i18n.DISMISS_CALLOUT}</EuiButton>
    </EuiCallOut>
  ) : null;
};

export const ReadOnlyCallOut = memo(ReadOnlyCallOutComponent);
