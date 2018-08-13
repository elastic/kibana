/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import omit from 'lodash/fp/omit';
import React from 'react';
import { InferableComponentEnhancerWithProps } from 'react-redux';

type RendererResult = React.ReactElement<any> | null;
type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;

export type ChildFunctionRendererProps<RenderArgs> = {
  children: RendererFunction<RenderArgs>;
} & RenderArgs;

export const asChildFunctionRenderer = <InjectedProps, OwnProps>(
  hoc: InferableComponentEnhancerWithProps<InjectedProps, OwnProps>
) =>
  hoc(
    Object.assign(
      (props: ChildFunctionRendererProps<InjectedProps>) => props.children(omit('children', props)),
      {
        displayName: 'ChildFunctionRenderer',
      }
    )
  );
