/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { map } from 'lodash';
import { ResponseActionFormField } from './endpoint_response_action_form_field';
import type { ArrayItem } from '../../../shared_imports';
import { UseField, useFormData } from '../../../shared_imports';

interface EndpointResponseActionProps {
  item: ArrayItem;
  editDisabled: boolean;
}

export const EndpointResponseAction = React.memo((props: EndpointResponseActionProps) => {
  // TODO Decide when should it be available
  // const endpointPrivileges = useUserPrivileges().endpointPrivileges;
  const [data] = useFormData();

  const usedEndpointCommands = map(data.responseActions, (responseAction) => {
    return responseAction?.params?.command;
  });
  return (
    <UseField
      path={`${props.item.path}.params`}
      componentProps={{
        editDisabled: props.editDisabled,
        usedEndpointCommands,
      }}
      component={ResponseActionFormField}
      readDefaultValueOnForm={!props.item.isNew}
    />
  );
});
EndpointResponseAction.displayName = 'EndpointResponseAction';
