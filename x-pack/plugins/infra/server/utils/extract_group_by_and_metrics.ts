/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import * as uuid from 'uuid';
import { InfraGroupBy, InfraGroupByFilter } from '../../common/types';
import { InfraNodesKey, InfraNodeType } from '../lib/infra_types';

interface NodeTypeMapping {
  [name: string]: InfraNodeType;
}

interface NodeKeyMapping {
  [name: string]: InfraNodesKey;
}

const NODES_KEY_TO_KEY: NodeKeyMapping = {
  containers: InfraNodesKey.containers,
  hosts: InfraNodesKey.hosts,
  pods: InfraNodesKey.pods,
  services: InfraNodesKey.services,
};

const NODES_TO_TYPES: NodeTypeMapping = {
  containers: InfraNodeType.container,
  hosts: InfraNodeType.host,
  pods: InfraNodeType.pod,
  services: InfraNodeType.service,
};

import {
  ArgumentNode,
  FieldNode,
  GraphQLResolveInfo,
  ListValueNode,
  ObjectFieldNode,
  ObjectValueNode,
  SelectionNode,
  SelectionSetNode,
  StringValueNode,
  ValueNode,
} from 'graphql';

interface InfraGroupByAndMetricOptions {
  groupBy: InfraGroupBy[];
  metrics: string[];
  nodeType: InfraNodeType;
  nodesKey: InfraNodesKey;
}

export function extractGroupByAndMetrics(info: GraphQLResolveInfo): InfraGroupByAndMetricOptions {
  const {
    groupBy,
    metrics,
    nodeType,
    nodesKey,
  }: InfraGroupByAndMetricOptions = info.fieldNodes.reduce(parseFieldNodes, {
    groupBy: [],
    metrics: [],
    nodeType: InfraNodeType.host,
    nodesKey: InfraNodesKey.hosts,
  });
  return { groupBy, metrics, nodeType, nodesKey };
}

function isFieldNode(subject: any): subject is FieldNode {
  return subject.kind === 'Field';
}

function isGroupsSelection(subject: SelectionNode): subject is FieldNode {
  return isFieldNode(subject) && subject.name.value === 'groups' && subject.arguments != null;
}

function isMetricSelection(subject: SelectionNode): subject is FieldNode {
  return isFieldNode(subject) && subject.name.value === 'metrics' && subject.selectionSet != null;
}

function isNodeSelection(subject: any): subject is FieldNode {
  return (
    isFieldNode(subject) &&
    ['hosts', 'pods', 'containers', 'services'].includes(subject.name.value) &&
    subject.selectionSet != null
  );
}

function isListValue(subject: any): subject is ListValueNode {
  return subject.kind === 'ListValue';
}

function isObjectValueNode(subject: any): subject is ObjectValueNode {
  return subject.kind === 'ObjectValue';
}

function isStringValueNode(subject: any): subject is StringValueNode {
  return subject.kind === 'StringValue';
}

function parseFieldNodes(
  ctx: InfraGroupByAndMetricOptions,
  node: SelectionNode
): InfraGroupByAndMetricOptions {
  if (isFieldNode(node) && node.selectionSet) {
    const { selections }: SelectionSetNode = node.selectionSet;
    selections.forEach((selection: SelectionNode): void => {
      if (isGroupsSelection(selection)) {
        const grouping: any = { id: uuid.v1() };
        selection!.arguments!.forEach((argumentNode: ArgumentNode): void => {
          const key: string = get(argumentNode, 'name.value');
          if (isListValue(argumentNode.value)) {
            const listValueNode = argumentNode.value;
            const { values } = listValueNode;
            const value: InfraGroupByFilter[] = values.map(
              (valueNode: ValueNode): InfraGroupByFilter => {
                const filter = {};
                if (isObjectValueNode(valueNode)) {
                  valueNode.fields.forEach((f: ObjectFieldNode) => {
                    const { value: fieldValue } = f;
                    if (isStringValueNode(fieldValue)) {
                      set(filter, f.name.value, fieldValue.value);
                    }
                  });
                }
                return filter as InfraGroupByFilter;
              }
            );
            set(grouping, key, value);
          } else {
            const value: string = get(argumentNode, 'value.value');
            set(grouping, key, value);
          }
        });
        ctx.groupBy.push(grouping);
      }
      if (isMetricSelection(selection)) {
        const { selections: innerSelections } = selection.selectionSet!;
        innerSelections.forEach((s: any): any => {
          ctx.metrics.push(get(s, 'name.value'));
        });
      }
      if (isNodeSelection(selection)) {
        ctx.nodesKey = NODES_KEY_TO_KEY[selection.name.value];
        ctx.nodeType = NODES_TO_TYPES[selection.name.value];
      }
      parseFieldNodes(ctx, selection);
    });
  }
  return ctx;
}
