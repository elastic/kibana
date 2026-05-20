export declare const MINIMUM_GROUP_SIZE = 4;
export declare const DEFAULT_EDGE_COLOR: string;
export declare const DEFAULT_EDGE_STROKE_WIDTH = 1;
export declare const DEFAULT_MARKER_SIZE = 12;
export declare const DEFAULT_EDGE_STYLE: {
    readonly stroke: string;
    readonly strokeWidth: 1;
};
/** Service names that should be filtered out */
export declare const FORBIDDEN_SERVICE_NAMES: string[];
export declare const SERVICE_MAP_TIMEOUT_ERROR = "ServiceMapTimeoutError";
/**
 * Span types and subtypes that should NOT be grouped.
 * Key is span type, value is array of subtypes ('all' means all subtypes).
 */
export declare const NONGROUPED_SPANS: Record<string, string[]>;
export declare const GROUPABLE_SPAN_TYPE = "external";
export declare const GROUPABLE_SPAN_SUBTYPE = "http";
export declare const SERVICE_NODE_CIRCLE_SIZE = 56;
export declare const DEPENDENCY_NODE_DIAMOND_SIZE = 48;
/** Border width (px) for service and dependency nodes when not selected. */
export declare const NODE_BORDER_WIDTH_DEFAULT = 3;
/** Border width (px) for service and dependency nodes when selected. */
export declare const NODE_BORDER_WIDTH_SELECTED = 4;
export declare const DEPENDENCY_NODE_DIAMOND_CONTAINER_SIZE: number;
export declare const NODE_WIDTH = 200;
export declare const NODE_HEIGHT = 80;
export declare const RANK_SEPARATION = 120;
export declare const NODE_SEPARATION = 80;
export declare const GRAPH_MARGIN = 50;
