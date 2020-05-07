/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import uuid from 'uuid';
import { EuiToken, EuiTreeView, EuiToolTip } from '@elastic/eui';
import { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import {
  InterpreterResult as InterpreterResultType,
  isInterpreterResult,
} from 'src/plugins/expressions/public';
import ReactMarkdown from 'react-markdown';

interface Props {
  result: InterpreterResultType;
}

const pushResult = (items: Node[], result: InterpreterResultType): Node[] => {
  const { fn, args, context, out } = result;

  if (isInterpreterResult(context)) {
    items = pushResult(items, context);
  } else {
    // no-op - should this do something?
  }

  const children: Node[] = [];

  Object.keys(args).forEach(key => {
    const arg = args[key];

    if (isInterpreterResult(arg)) {
      pushResult(children, arg);
    } else {
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
    }
  });

  items.push({
    label: `${fn.name}: ${out.type ? out.type : out}`,
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
  items = pushResult(items, result);

  return (
    <EuiTreeView showExpansionArrows items={items} display="compressed" aria-label="Expression" />
  );
};
