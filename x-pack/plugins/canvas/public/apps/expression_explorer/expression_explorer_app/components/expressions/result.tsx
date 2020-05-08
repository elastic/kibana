/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import uuid from 'uuid';
import { EuiToken, EuiTreeView, EuiToolTip } from '@elastic/eui';
import { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import ReactMarkdown from 'react-markdown';
import { ExpressionAstFunction } from 'src/plugins/expressions';

interface Props {
  result: ExpressionAstFunction[];
}

const pushResult = (items: Node[], result: ExpressionAstFunction): Node[] => {
  const { debug } = result;

  if (!debug) {
    return items;
  }

  const { fn, args, input, output, duration } = debug;
  const children: Node[] = [];

  Object.keys(args).forEach(key => {
    const arg = args[key];

    // if (isInterpreterResult(arg)) {
    //   pushResult(children, arg);
    // } else {
    let label = arg;
    if (arg) {
      if (arg.type) {
        label = arg.type;
      } else if (typeof arg === 'function') {
        label = 'fn';
      }
    }
    children.push({
      label: `${key}: ${label}`,
      id: key,
      icon: <EuiToken size="xs" iconType="tokenVariable" />,
    });
    // }
  });

  const outputStr = output ? `: ${output.type ? output.type : output}` : '';
  const durationStr = duration ? '(' + Math.round(duration * 100) / 100 + 'ms)' : '';

  items.push({
    label: `${fn.name}${outputStr}${durationStr}`,
    id: fn.name + '_' + uuid(),
    icon: (
      <EuiToolTip content={<ReactMarkdown>{fn.help}</ReactMarkdown>} position="right">
        <EuiToken size="xs" iconType="tokenFunction" />
      </EuiToolTip>
    ),
    isExpanded: true,
    children,
  });
  return items;
};

export const InterpreterResult: FC<Props> = ({ result }) => {
  let items: Node[] = [];
  result.forEach(fn => {
    items = pushResult(items, fn);
  });

  return (
    <EuiTreeView showExpansionArrows items={items} display="compressed" aria-label="Expression" />
  );
};
