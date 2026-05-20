import React from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import type { DependencyNodeData } from '../../../../common/service_map';
type DependencyNodeType = Node<DependencyNodeData, 'dependency'>;
export declare const DependencyNode: React.MemoExoticComponent<({ data, selected, sourcePosition, targetPosition }: NodeProps<DependencyNodeType>) => React.JSX.Element>;
export {};
