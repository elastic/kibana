/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export const ActionNeededPrompt: FunctionComponent<Props> = ({ children, style }) => (
  <EuiEmptyPrompt
    iconType="watchesApp"
    data-test-subj="createFirstAlertEmptyPrompt"
    style={style ?? {}}
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.components.actionNeededPrompt.title"
          defaultMessage="Action needed"
        />
      </h2>
    }
    body={children}
  />
);
