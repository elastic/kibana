/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
// @ts-ignore
import { getInterpreter } from 'plugins/interpreter/interpreter';
// @ts-ignore
import { renderersRegistry } from 'plugins/interpreter/registries';
import React, { useEffect, useRef } from 'react';

export const runPipeline = async (expression: string, context: object, handlers: any) => {
  const ast = fromExpression(expression);
  const { interpreter } = await getInterpreter();
  const pipelineResponse = await interpreter.interpretAst(ast, context, handlers);
  return pipelineResponse;
};

async function runAndRender(expression: any, domElement: any) {
  const response = await runPipeline(expression, {}, { getInitialContext: () => ({}) });
  if (response.type === 'render') {
    renderersRegistry.get(response.as).render(domElement, response.value);
  }
}

export function ExpressionRenderer(props: any) {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);

  useEffect(() => {
    if (mountpoint.current) {
      runAndRender(props.expression, mountpoint.current);
    }
  });

  return (
    <div
      ref={el => {
        mountpoint.current = el;
      }}
    />
  );
}
