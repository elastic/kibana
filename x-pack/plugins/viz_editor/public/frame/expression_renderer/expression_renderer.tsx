/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
import classNames from 'classnames';
import React, { useEffect, useRef } from 'react';
import { DataAdapter, RequestAdapter } from 'ui/inspector/adapters';

async function runAndRender(
  expression: any,
  domElement: any,
  getInterpreter: any,
  renderersRegistry: any
) {
  if (!expression) {
    return;
  }
  const ast = fromExpression(expression);
  const { interpreter } = await getInterpreter();
  const response = await interpreter.interpretAst(
    ast,
    { type: 'null' },
    {
      getInitialContext: () => ({}),
      inspectorAdapters: {
        requests: new RequestAdapter(),
        data: new DataAdapter(),
      },
    }
  );
  if (response.type === 'render') {
    renderersRegistry.get(response.as).render(domElement, response.value, {
      onDestroy: (fn: () => never) => {
        /* this is just here for compatibility with legacy kibana renderers */
      },
      done: () => {
        /* this is just here for compatibility with legacy kibana renderers */
      },
    });
  } else {
    // tslint:disable-next-line:no-console
    console.log('Unexpected result of expression', response);
  }
}

export interface ExpressionRendererProps {
  expression: string;
  getInterpreter: () => Promise<{ interpreter: any }>;
  renderersRegistry: { get: (renderer: string) => any };
  size?: 'full' | 'preview';
}

export function ExpressionRenderer(props: ExpressionRendererProps) {
  const mountpoint: React.MutableRefObject<null | HTMLDivElement> = useRef(null);

  useEffect(
    () => {
      if (mountpoint.current) {
        mountpoint.current.style.position = 'relative';
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
      className={classNames({
        'expressionRenderer-full': !props.size || props.size === 'full',
        'expressionRenderer-preview': props.size === 'preview',
      })}
      ref={el => {
        mountpoint.current = el;
      }}
    />
  );
}
