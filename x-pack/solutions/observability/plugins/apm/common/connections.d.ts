export { NodeType, type ServiceNode, type DependencyNode, type Node, type ConnectionStats, type ConnectionStatsItem, type ConnectionStatsItemWithImpact, type ConnectionStatsItemWithComparisonData, } from '@kbn/apm-types';
import { type Node } from '@kbn/apm-types';
export declare function getNodeName(node: Node): string;
