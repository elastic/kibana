/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricInput, InfraPathInput } from '../../../../common/graphql/types';

import {
  ArgumentNode,
  FieldNode,
  GraphQLResolveInfo,
  ListValueNode,
  SelectionNode,
  SelectionSetNode,
  valueFromASTUntyped,
} from 'graphql';

interface InfraPathsAndMetricOptions {
  path: InfraPathInput[];
  metric: InfraMetricInput | null;
}

export function extractPathsAndMetric(info: GraphQLResolveInfo): InfraPathsAndMetricOptions {
  if (info.variableValues.metric && info.variableValues.path) {
    return {
      metric: info.variableValues.metric as InfraMetricInput,
      path: info.variableValues.path as InfraPathInput[],
    };
  }

  const { path, metric }: InfraPathsAndMetricOptions = info.fieldNodes.reduce(parseFieldNodes, {
    path: [],
    metric: null,
  });
  return { path, metric };
}

function isFieldNode(subject: any): subject is FieldNode {
  return subject.kind === 'Field';
}

function isListValueNode(subject: any): subject is ListValueNode {
  return subject.kind === 'ListValue';
}

function isMetricSelection(subject: SelectionNode): subject is FieldNode {
  return isFieldNode(subject) && subject.name.value === 'metrics' && subject.selectionSet != null;
}

function isArgumentNode(subject: any): subject is ArgumentNode {
  return subject.kind === 'Argument';
}

function hasPathArguments(subject: FieldNode): boolean {
  return (
    (subject.arguments && subject.arguments.find(arg => arg.name.value === 'path') && true) || false
  );
}

function extractArgument<ReturnType>(selection: FieldNode, name: string): ReturnType[] {
  if (!selection.arguments) {
    return [];
  }
  const result = selection.arguments
    .filter(isArgumentNode)
    .filter(subject => subject.name.value === name)
    .reduce((prev: ReturnType, argument: ArgumentNode) => {
      if (isListValueNode(argument.value)) {
        return valueFromASTUntyped(argument.value);
      }
      return prev;
    }, []);
  return result;
}

function extractPathArgument(selection: FieldNode): InfraPathInput[] {
  return extractArgument<InfraPathInput>(selection, 'path') as InfraPathInput[];
}

function extractMetricArgument(selection: FieldNode): InfraMetricInput | null {
  if (!selection.arguments) {
    return null;
  }
  return selection.arguments
    .filter(isArgumentNode)
    .filter(subject => subject.name.value === 'metric')
    .reduce((prev: InfraMetricInput[], argument: ArgumentNode) => {
      return valueFromASTUntyped(argument.value);
    }, [])
    .pop();
}

function parseFieldNodes(
  ctx: InfraPathsAndMetricOptions,
  node: SelectionNode
): InfraPathsAndMetricOptions {
  if (isFieldNode(node) && node.selectionSet) {
    const { selections }: SelectionSetNode = node.selectionSet;
    selections.forEach(
      (selection: SelectionNode): void => {
        if (isMetricSelection(selection) && selection.arguments) {
          const metric = extractMetricArgument(selection);
          ctx.metric = metric;
        }
        parseFieldNodes(ctx, selection);
      }
    );
    if (hasPathArguments(node)) {
      const paths = extractPathArgument(node);
      ctx.path = paths || [];
    }
  }
  return ctx;
}
