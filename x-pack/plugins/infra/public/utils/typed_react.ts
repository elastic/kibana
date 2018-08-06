/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import omit from 'lodash/fp/omit';
import React from 'react';
import { InferableComponentEnhancerWithProps } from 'react-redux';

export type ChildFunctionRendererProps<RenderArgs> = {
  children: (params: RenderArgs) => React.ReactElement<any> | null;
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

// type ComposableComponent<ChildProps> = React.ComponentType<{
//   children: (props: ChildProps) => React.ReactElement<any> | null;
// }>;

// type PropsOf<Component> = Component extends React.ComponentType<{
//   children: (props: infer Props) => any;
// }>
//   ? Props
//   : never;

// export const Compose2 = <
//   C1 extends ComposableComponent<any>,
//   C2 extends ComposableComponent<any>
// >(props: {
//   children: (args: [PropsOf<C1>, PropsOf<C2>]) => React.ReactElement<any> | null;
//   components: [C1, C2];
// }) => {
//   const { composedElement, composedRender } = props.components
//     .slice()
//     .reverse()
//     .reduce<{ composedElement: React.ReactElement<any>; composedRender: any }>((acc, component) => {
//       const renderNext = (value: any): any => acc.composedElement
//       return {
//         composedElement: React.createElement(component, { children: renderNext }),
//         composedRender: null,
//       };
//     }, {});

//   return composedElement;
// };
// React.createElement(props.components[0], {
//   children: (p1: PropsOf<C1>): any =>
//     React.createElement(props.components[1], {
//       children: (p2: PropsOf<C2>): any =>
//        React.createElement(props.components[2], {
//          children: (p3: PropsOf<C3>): any => props.children([p1, p2]),
//        }),
//     }),
// });
// React.createElement(props.components[0], {
//   children: (p1: PropsOf<C1>): any =>
//     React.createElement(props.components[1], {
//       children: (p2: PropsOf<C2>): any => props.children([p1, p2]),
//     }),
// });
// React.cloneElement(props.elements[0], undefined, (p1: P1) =>
//   React.cloneElement(props.elements[1], undefined, (p2: P2) => props.children([p1, p2]))
// );

// type ComposableElement<Props> = React.ReactElement<{
//   children: (props: Props) => React.ReactElement<any> | null;
// }>;

// type ComposableComponent<Props> =
//   | ComposableElement<Props>
//   | (({ results, render }: { results: any, render: any }) => ComposableElement<Props>);

// type ComposableComponents = Array<ComposableComponent<any>>;

// type PropsOf<Component> = Component extends ComposableComponent<infer Props> ? Props : never;

// type ComposedPropsOf<Components extends ComposableComponents> = {
//   [Index in keyof Components]: PropsOf<Components[Index]>
// };

// interface ComposeComponentsProps<Components extends ComposableComponents> {
//   children: (props: ComposedPropsOf<Components>) => React.ReactElement<any> | null;
//   components: Components;
// }

// export const ComposeComponents = <Components extends ComposableComponents>(
//   props: ComposeComponentsProps<Components>
// ) => null;

// function renderRecursively<ComposedProps extends Array<{}>>(
//   render: (props: ComposedProps) => React.ReactElement<any> | null,
//   composables: ComposableComponents,
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
