/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { SystemLogActionParams } from './types';
import OsqueryResponseActionParamsForm from '../shared_components/osquery_response_action_type';

export const ServerLogParamsFields: React.FunctionComponent<
  ActionParamsProps<SystemLogActionParams>
> = (props) => {
  console.error('props', props);

  const handleError = useCallback(() => {}, []);

  const handleChange = useCallback((data) => props.editAction('action', data, props.index), []);

  return (
    <OsqueryResponseActionParamsForm
      defaultValues={props.actionParams.action}
      onError={handleError}
      onChange={handleChange}
    />
  );

  // return (
  //   <TextAreaWithMessageVariables
  //     index={index}
  //     editAction={editAction}
  //     messageVariables={messageVariables}
  //     paramsProperty={'message'}
  //     inputTargetValue={message}
  //     label={i18n.translate(
  //       'xpack.stackConnectors.components.systemLogExample.logMessageFieldLabel',
  //       {
  //         defaultMessage: 'Message',
  //       }
  //     )}
  //     errors={errors.message as string[]}
  //   />
  // );
};

// eslint-disable-next-line import/no-default-export
export { ServerLogParamsFields as default };
