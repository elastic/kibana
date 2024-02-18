/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { SystemLogActionParams } from './types';
import { EndpointResponseAction } from '../../detection_engine/rule_response_actions/endpoint/endpoint_response_action';
import { Form, useForm, useFormData } from '../../shared_imports';

export const ServerLogParamsFields: React.FunctionComponent<
  ActionParamsProps<SystemLogActionParams>
> = (props) => {
  const { form } = useForm({
    schema: { action: { params: { type: 'json' } } },
  });

  const [formData] = useFormData({ form });

  useEffect(() => {
    props.editAction('action', formData?.action?.params, props.index);
  }, [formData?.action?.params]);

  return (
    <Form form={form}>
      <EndpointResponseAction item={{ id: 'action', path: 'action', isNew: false }} />
    </Form>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServerLogParamsFields as default };
