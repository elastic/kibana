/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ResponseActionFormField } from './endpoint_response_action_form_field';
import type { ArrayItem } from '../../../shared_imports';
import { UseField } from '../../../shared_imports';

interface EndpointResponseActionProps {
  item: ArrayItem;
}

const GhostFormField = () => <></>;

export const EndpointResponseAction = React.memo((props: EndpointResponseActionProps) => {
  // add capability check here

  return (
    <UseField
      path={`${props.item.path}.params`}
      component={ResponseActionFormField}
      readDefaultValueOnForm={!props.item.isNew}
    />
  );
});
EndpointResponseAction.displayName = 'EndpointResponseAction';
