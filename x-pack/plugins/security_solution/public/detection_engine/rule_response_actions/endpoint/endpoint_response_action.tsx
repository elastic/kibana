/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ArrayItem } from '../../../shared_imports';
import { CommentField } from './comment_field';
import { ActionTypeField } from './action_type_field';

interface EndpointResponseActionProps {
  item: ArrayItem;
  editDisabled: boolean;
}

export const EndpointResponseAction = React.memo((props: EndpointResponseActionProps) => (
  <>
    <ActionTypeField
      basePath={`${props.item.path}.params`}
      disabled={props.editDisabled}
      readDefaultValueOnForm={!props.item.isNew}
    />
    <CommentField
      basePath={`${props.item.path}.params`}
      disabled={props.editDisabled}
      readDefaultValueOnForm={!props.item.isNew}
    />
  </>
));
EndpointResponseAction.displayName = 'EndpointResponseAction';
