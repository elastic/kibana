/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiDraggable, EuiDragDropContext } from '@elastic/eui';

type PropsOf<T> = T extends React.ComponentType<infer ComponentProps> ? ComponentProps : never;
type FirstArgumentOf<Func> = Func extends (arg1: infer FirstArgument, ...rest: any[]) => any
  ? FirstArgument
  : never;
export type DragHandleProps = FirstArgumentOf<
  Exclude<PropsOf<typeof EuiDraggable>['children'], React.ReactElement>
>['dragHandleProps'];
export type DropResult = FirstArgumentOf<FirstArgumentOf<typeof EuiDragDropContext>['onDragEnd']>;
