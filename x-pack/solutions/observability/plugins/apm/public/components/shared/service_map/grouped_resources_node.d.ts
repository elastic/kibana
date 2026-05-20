import React from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import type { GroupedNodeData } from '../../../../common/service_map';
type GroupedResourcesNodeType = Node<GroupedNodeData, 'groupedResources'>;
export declare const GroupedResourcesNode: React.MemoExoticComponent<({ data, selected, sourcePosition, targetPosition }: NodeProps<GroupedResourcesNodeType>) => React.JSX.Element>;
export {};
