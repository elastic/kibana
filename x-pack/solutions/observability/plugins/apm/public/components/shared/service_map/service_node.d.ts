/**
 * Service node rendered inside the React Flow Service Map. Lives under
 * `components/shared/` because it is consumed by both the main Service Map
 * (`components/app/service_map/graph.tsx`) and the Agent Builder service map
 * attachment. "Shared" here means intra-APM reuse only — the component still
 * imports APM plugin context and APM-specific badges. Optional behaviors
 * (alerts-tab navigation, SLO flyout) are injected via sibling React contexts
 * so they no-op gracefully when the surrounding providers are absent.
 */
import React from 'react';
import { type Node, type NodeProps } from '@xyflow/react';
import type { ServiceNodeData } from '../../../../common/service_map';
type ServiceNodeType = Node<ServiceNodeData, 'service'>;
export declare const ServiceNode: React.MemoExoticComponent<({ data, selected, sourcePosition, targetPosition }: NodeProps<ServiceNodeType>) => React.JSX.Element>;
export {};
