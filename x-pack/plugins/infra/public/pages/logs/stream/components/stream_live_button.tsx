/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const StreamLiveButton: React.FC<{
  isStreaming: boolean;
  onStartStreaming: () => void;
  onStopStreaming: () => void;
}> = ({ isStreaming, onStartStreaming, onStopStreaming }) =>
  isStreaming ? (
    <EuiButtonEmpty
      data-test-subj="infraStreamLiveButtonStopStreamingButton"
      color="warning"
      iconSide="left"
      iconType="pause"
      onClick={onStopStreaming}
    >
      <FormattedMessage
        id="xpack.infra.logs.stopStreamingButtonLabel"
        defaultMessage="Stop streaming"
      />
    </EuiButtonEmpty>
  ) : (
    <EuiButtonEmpty
      data-test-subj="infraStreamLiveButtonStreamLiveButton"
      color="primary"
      iconSide="left"
      iconType="play"
      onClick={onStartStreaming}
    >
      <FormattedMessage
        id="xpack.infra.logs.startStreamingButtonLabel"
        defaultMessage="Stream live"
      />
    </EuiButtonEmpty>
  );
