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

// type ComposableComponent<ChildProps> = (
//   props: {
//     children: (args: ChildProps) => RendererResult;
//   }
// ) => RendererResult;

// type ChildArgsOf<Component> = Component extends React.ComponentType<{
//   children: (props: infer ChildArgs) => any;
// }>
//   ? ChildArgs
//   : never;

// type ComposedChildFunction<C extends ComponentTuple> = C extends [ComposableComponent<infer A1>]
//   ? RendererFunction<[A1]>
//   // : ComposedChildFunction2<C>;
//   : never;
// type ComposedChildFunction2<C> = C extends [
//   ComposableComponent<infer A1>,
//   ComposableComponent<infer A2>
// ]
//   ? RendererFunction<[A1, A2]>
//   : ComposedChildFunction3<C>;
// type ComposedChildFunction3<C> = C extends [
//   ComposableComponent<infer A1>,
//   ComposableComponent<infer A2>,
//   ComposableComponent<infer A3>
// ]
//   ? RendererFunction<[A1, A2, A3]>
//   : 'XXX';
// type ComposedChildFunction<C> = C extends [
//   ComposableComponent<infer A1>,
//   ComposableComponent<infer A2>,
//   ComposableComponent<infer A3>
// ]
//   ? RendererFunction<[A1, A2, A3]>
//   : C extends [ComposableComponent<infer A1>, ComposableComponent<infer A2>]
//     ? RendererFunction<[A1, A2]>
//     : C extends [ComposableComponent<infer A1>] ? RendererFunction<[A1]> : never;

// interface ComposeProps<Components, RendererArgs> {
//   components: Components;
//   children: RendererFunction<RendererArgs>;
// }

// type InferableComposeProps<C extends ComponentTuple> = C extends [ComposableComponent<infer A1>]
//   ? ComposeProps<C, [A1]>
//   : InferableComposeProps2<C>;
// type InferableComposeProps2<C> = C extends [
//   ComposableComponent<infer A1>,
//   ComposableComponent<infer A2>
// ]
//   ? ComposeProps<C, [A1, A2]>
//   : InferableComposeProps3<C>;
// type InferableComposeProps3<C> = C extends [
//   ComposableComponent<infer A1>,
//   ComposableComponent<infer A2>,
//   ComposableComponent<infer A3>
// ]
//   ? ComposeProps<C, [A1, A2, A3]>
//   : never;

// const A = (props: { children: (args: { x: number }) => React.ReactElement<any> | null }) =>
//   props.children({ x: 1 });
// const B = (props: { children: (args: { x: string }) => React.ReactElement<any> | null }) =>
//   props.children({ x: 'b' });
// const Comp = (props: { children: RendererFunction<string>; v: number }) =>
//   props.children(`${props.v}`);
// const CC = <R extends RendererFunction<any>>(x: number, render: R) => <Comp v={x}>{render}</Comp>;

// interface ComposeProps<Components extends ComponentTuple> {
//   components: Components;
//   children: ComposedChildFunction<Components>;
// }

// interface ComposeT {
//   <C extends [ComposableComponent<any>, ComposableComponent<any>]>(
//     props: {
//       components: C;
//       children: (a: [ChildArgsOf<C[0]>, ChildArgsOf<C[1]>]) => React.ReactElement<any> | null;
//     }
//   ): React.ReactElement<any> | null;
//   <C extends [ComposableComponent<any>]>(
//     props: { components: C; children: (a1: [ChildArgsOf<C[0]>]) => React.ReactElement<any> | null }
//   ): React.ReactElement<any> | null;
//   // <C extends Array<ComposableComponent<any>>>(
//   //   props: {
//   //     components: C;
//   //     children: (...args: any[]) => React.ReactNode;
//   //   }
//   // ): React.ReactNode;
// }

// type ArgsTuple = [any] | [any, any] | [any, any, any];

// type ComponentTuple =
//   | [ComposableComponent<any>]
//   | [ComposableComponent<any>, ComposableComponent<any>]
//   | [ComposableComponent<any>, ComposableComponent<any>, ComposableComponent<any>];

// interface ComposeSFC extends React.SFC<any> {
//   <Components extends ComponentTuple>(
//     // props: InferableComposeProps<Components>
//     props: ComposeProps<Components>
//   ): RendererResult;
// }

// const Compose = <Components extends ComponentTuple>(
//   // props: InferableComposeProps<Components>
//   props: ComposeProps<Components>
// ): RendererResult => null;

// const Compose = ComposeRaw as ComposeSFC;

// const Compose: ComposeT = (props: any) => null as any;

// const X = <Compose components={[A, B]}>{a => <div />}</Compose>;
// const X1 = Compose({ components: [A, B], children: a => <div /> });

// function renderRecursively<ComposedProps>(
//   render: (props: ComposedProps) => React.ReactElement<any> | null,
//   composables: Array<ComposableComponent<any>>,
//   accumulatedProps: ComposedProps = [] as any
// ) {
//   const [composable, ...otherComposables] = composables;
//   // Once components is exhausted, we can render out the results array.
//   if (!composable) {
//     return render(accumulatedProps);
//   }

//   // Continue recursion for remaining items.
//   // results.concat([value]) ensures [...results, value] instead of [...results, ...value]
//   const renderNext = (nextProps: ComposedProps[number]) =>
//     renderRecursively(render, otherComposables, [...accumulatedProps, nextProps]);

//   // Each props.components entry is either an element or function [element factory]
//   return typeof composable === 'function'
//     ? // When it is a function, produce an element by invoking it with "render component values".
//       composable({ results, render: nextRender })
//     : // When it is an element, enhance the element's props with the render prop.
//       cloneElement(remaining[0], { children: nextRender });
// }
