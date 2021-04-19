/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-function-as-prop, react/jsx-no-bind */

import React, { Fragment } from 'react';
import { EuiTextArea } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionParamsProps } from '../../../triggers_actions_ui/public/types';

interface ExampleActionParams {
  message: string;
}

const ExampleParamsFields: React.FunctionComponent<ActionParamsProps<ExampleActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  // console.error('actionParams', actionParams, index, errors);
  const { message } = actionParams;
  return (
    <Fragment>
      <EuiTextArea
        fullWidth
        isInvalid={errors.message.length > 0 && message !== undefined}
        name="message"
        value={message || ''}
        onChange={(e) => {
          editAction('message', e.target.value, index);
        }}
        onBlur={() => {
          if (!message) {
            editAction('message', '', index);
          }
        }}
      />
    </Fragment>
  );
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { ExampleParamsFields as default };
