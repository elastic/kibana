/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
import React, { useEffect, useRef } from 'react';

async function runAndRender(
  expression: any,
  domElement: any,
  getInterpreter: any,
  renderersRegistry: any
) {
  const ast = fromExpression(expression);
  const { interpreter } = await getInterpreter();
  const response = await interpreter.interpretAst(ast, {}, { getInitialContext: () => ({}) });
  if (response.type === 'render') {
    renderersRegistry.get(response.as).render(domElement, response.value, {
      onDestroy: (fn: () => never) => {
        /* this is just here for compatibility with legacy kibana renderers */
      },
    });
  }
}

export function ExpressionRenderer(props: any) {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);

  useEffect(
    () => {
      if (mountpoint.current) {
        runAndRender(
          props.expression,
          mountpoint.current,
          props.getInterpreter,
          props.renderersRegistry
        );
      }
    },
    [props.expression, mountpoint.current, props.getInterpreter, props.renderersRegistry]
  );

  return (
    <div
      ref={el => {
        mountpoint.current = el;
      }}
    />
  );
}
