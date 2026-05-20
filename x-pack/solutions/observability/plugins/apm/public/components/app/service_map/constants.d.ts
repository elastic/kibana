/**
 * Layout constants for the React Flow service map (client-side only)
 */
/** Width of each node in pixels */
export declare const NODE_WIDTH = 200;
/** Height of each node in pixels */
export declare const NODE_HEIGHT = 80;
/** Vertical spacing between ranks (levels) in the graph */
export declare const RANK_SEPARATION = 120;
/** Horizontal spacing between nodes at the same rank */
export declare const NODE_SEPARATION = 80;
/** Margin around the graph edges */
export declare const GRAPH_MARGIN = 50;
/** Padding around the graph when fitting the view (as a ratio) */
export declare const FIT_VIEW_PADDING = 0.2;
/** Duration of the fit view animation in milliseconds */
export declare const FIT_VIEW_DURATION = 200;
/** Delay before calling fitView after layout update (ms), to allow React Flow to measure nodes */
export declare const FIT_VIEW_DEFER_MS = 50;
/** Size of the default marker */
export declare const DEFAULT_MARKER_SIZE = 12;
/** Size of the highlighted marker */
export declare const HIGHLIGHTED_MARKER_SIZE = 14;
/** Width of the default stroke */
export declare const DEFAULT_STROKE_WIDTH = 1;
/** Width of the highlighted stroke */
export declare const HIGHLIGHTED_STROKE_WIDTH = 2;
/** Default node size in pixels when measured dimensions are not available */
export declare const DEFAULT_NODE_SIZE = 56;
/** Off-screen position for hidden elements (ensures they don't flash on screen) */
export declare const OFFSCREEN_POSITION = -10000;
/** Divisor for calculating popover offset from edge midpoint */
export declare const EDGE_OFFSET_DIVISOR = 4;
/** Duration of the center animation in milliseconds */
export declare const CENTER_ANIMATION_DURATION_MS = 200;
/** Minimum distance threshold for directional keyboard navigation (in pixels) */
export declare const DIRECTION_THRESHOLD = 50;
/** Full screen mode: wrapper element when map is in full screen */
export declare const SERVICE_MAP_WRAPPER_FULL_SCREEN_CLASS = "serviceMapWrapper--fullScreen";
/** Full screen mode: inner container that gets position fixed */
export declare const SERVICE_MAP_FULL_SCREEN_CLASS = "serviceMap--fullScreen";
/** Body class to restrict scroll and layer when service map is full screen */
export declare const SERVICE_MAP_RESTRICT_BODY_CLASS = "serviceMap--restrictBody";
/**
 * Mock EUI theme colors for testing purposes.
 * These match the light theme values and are used to mock useEuiTheme in tests.
 */
export declare const MOCK_EUI_THEME: {
    readonly colors: {
        readonly primary: "#0077CC";
        readonly mediumShade: "#98A2B3";
        readonly primaryText: "#0077CC";
        readonly textPrimary: "#1a1c21";
        readonly emptyShade: "#fff";
        readonly backgroundBasePlain: "#fff";
        readonly backgroundBaseHighlighted: "#F6F9FC";
        readonly textParagraph: "#343741";
        readonly text: "#343741";
        readonly lightShade: "#D3DAE6";
        readonly success: "#00BFB3";
        readonly warning: "#FEC514";
        readonly danger: "#BD271E";
        readonly severity: {
            readonly success: "#00BFB3";
            readonly warning: "#FEC514";
            readonly danger: "#BD271E";
        };
    };
};
/**
 * Full mock EUI theme for useEuiTheme() in tests (colors + size + border + levels + shadows + font + animation).
 * Use in jest.mock('@elastic/eui') with useEuiTheme: () => ({ euiTheme: MOCK_EUI_THEME_FOR_USE_THEME, colorMode: 'LIGHT' }) when colorMode is needed.
 */
export declare const MOCK_EUI_THEME_FOR_USE_THEME: {
    colors: {
        readonly primary: "#0077CC";
        readonly mediumShade: "#98A2B3";
        readonly primaryText: "#0077CC";
        readonly textPrimary: "#1a1c21";
        readonly emptyShade: "#fff";
        readonly backgroundBasePlain: "#fff";
        readonly backgroundBaseHighlighted: "#F6F9FC";
        readonly textParagraph: "#343741";
        readonly text: "#343741";
        readonly lightShade: "#D3DAE6";
        readonly success: "#00BFB3";
        readonly warning: "#FEC514";
        readonly danger: "#BD271E";
        readonly severity: {
            readonly success: "#00BFB3";
            readonly warning: "#FEC514";
            readonly danger: "#BD271E";
        };
    };
    size: {
        base: string;
        xxs: string;
        xs: string;
        s: string;
        m: string;
        l: string;
        xl: string;
    };
    border: {
        radius: {
            small: string;
            medium: string;
        };
        width: {
            thin: string;
            thick: string;
        };
    };
    levels: {
        content: number;
        header: number;
        menu: number;
        flyout: number;
    };
    shadows: {
        s: string;
    };
    font: {
        family: string;
    };
    animation: {
        fast: string;
    };
};
/**
 * Mock primary color for testing (matches EUI light theme primary color)
 */
export declare const MOCK_PRIMARY_COLOR: "#0077CC";
/**
 * Mock default/medium shade color for testing (matches EUI light theme mediumShade)
 */
export declare const MOCK_DEFAULT_COLOR: "#98A2B3";
