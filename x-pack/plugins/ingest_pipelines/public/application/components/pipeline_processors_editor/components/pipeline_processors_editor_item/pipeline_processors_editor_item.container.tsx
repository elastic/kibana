/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { usePipelineProcessorsContext } from '../../context';

import {
  PipelineProcessorsEditorItem as ViewComponent,
  Props as ViewComponentProps,
} from './pipeline_processors_editor_item';

type Props = Omit<ViewComponentProps, 'editor' | 'processorsDispatch' | 'notifications'>;

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = (props) => {
  const { state, services } = usePipelineProcessorsContext();

  return (
    <ViewComponent
      {...props}
      notifications={services.notifications}
      editor={state.editor}
      processorsDispatch={state.processors.dispatch}
    />
  );
};
