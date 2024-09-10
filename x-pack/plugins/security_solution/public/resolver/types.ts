/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { Store, Middleware, Dispatch, AnyAction } from 'redux';
import type { BBox } from 'rbush';
import type { Provider } from 'react-redux';
import type {
  ResolverNode,
  ResolverRelatedEvents,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverPaginatedEvents,
  NewResolverTree,
  ResolverSchema,
} from '../../common/endpoint/types';
import type { Tree } from '../../common/endpoint/generate_data';
import type { State } from '../common/store/types';

export interface AnalyzerState {
  analyzer: AnalyzerById;
}

export interface AnalyzerById {
  [id: string]: ResolverState;
}

/**
 * Redux state for the Resolver feature. Properties on this interface are populated via multiple reducers using redux's `combineReducers`.
 */
export interface ResolverState {
  /**
   * Contains the state of the camera. This includes panning interactions, transform, and projection.
   */
  readonly camera: CameraState;

  /**
   * Contains the state associated with event data (process events and possibly other event types).
   */
  readonly data: DataState;

  /**
   * Contains the state needed to maintain Resolver UI elements.
   */
  readonly ui: ResolverUIState;
}

/**
 * Piece of `redux` state that models an animation for the camera.
 */
export interface ResolverUIState {
  /**
   * The `nodeID` for the process that is selected (in the `aria-activedescendent` sense of being selected.)
   */
  readonly ariaActiveDescendant: string | null;
  /**
   * `nodeID` of the selected node
   */
  readonly selectedNode: string | null;

  /**
   * The `search` part of the URL.
   */
  readonly locationSearch?: string;

  /**
   * An ID that is used to differentiate this Resolver instance from others concurrently running on the same page.
   */
  readonly resolverComponentInstanceID?: string;
}

/**
 * Piece of `redux` state that models an animation for the camera.
 */
export interface CameraAnimationState {
  /**
   * The time when the animation began.
   */
  readonly startTime: number;
  /**
   * The final translation when the animation is complete.
   */
  readonly targetTranslation: Vector2;
  /**
   * The effective camera position (including an in-progress user panning) at the time
   * when the animation began.
   */
  readonly initialTranslation: Vector2;

  /**
   * The duration, in milliseconds, that the animation should last. Should be > 0
   */
  readonly duration: number;
}

/**
 * The `redux` state for the `useCamera` hook.
 */
export type CameraState = {
  /**
   * Scales the coordinate system, used for zooming. Should always be between 0 and 1
   */
  readonly scalingFactor: number;

  /**
   * The size (in pixels) of the Resolver component.
   */
  readonly rasterSize: Vector2;

  /**
   * The camera world transform not counting any change from panning. When panning finishes, this value is updated to account for it.
   * Use the `translation` selector to get the effective translation adjusted for panning.
   */
  readonly translationNotCountingCurrentPanning: Vector2;

  /**
   * The world coordinates that the pointing device was last over. This is used during mouse-wheel zoom.
   */
  readonly latestFocusedWorldCoordinates: Vector2 | null;
} & (
  | {
      /**
       * Contains the animation start time and target translation. This doesn't model the instantaneous
       * progress of an animation. Instead, animation is model as functions-of-time.
       */
      readonly animation: CameraAnimationState;
      /**
       * If the camera is animating, it must not be panning.
       */
      readonly panning: undefined;
    }
  | {
      /**
       * If the camera is panning, it must not be animating.
       */
      readonly animation: undefined;
      /**
       * Contains the starting and current position of the pointer when the user is panning the map.
       */
      readonly panning: {
        /**
         * Screen coordinate vector representing the starting point when panning.
         */
        readonly origin: Vector2;

        /**
         * Screen coordinate vector representing the current point when panning.
         */
        readonly currentOffset: Vector2;
      };
    }
  | {
      readonly animation: undefined;
      readonly panning: undefined;
    }
);

/**
 * Wrappers around our internal types that make them compatible with `rbush`.
 */
export type IndexedEntity = IndexedEdgeLineSegment | IndexedTreeNode;

/**
 * The entity stored in `rbush` for resolver edge lines.
 */
export interface IndexedEdgeLineSegment extends BBox {
  type: 'edgeLine';
  entity: EdgeLineSegment;
}

/**
 * The entity store in `rbush` for resolver process nodes.
 */
export interface IndexedTreeNode extends BBox {
  type: 'treeNode';
  entity: ResolverNode;
  position: Vector2;
}

/**
 * A type containing all things to actually be rendered to the DOM.
 */
export interface VisibleEntites {
  processNodePositions: NodePositions;
  connectingEdgeLineSegments: EdgeLineSegment[];
}

export interface TreeFetcherParameters {
  /**
   * The `_id` for an ES document. Used to select a process that we'll show the graph for.
   */
  databaseDocumentID: string;

  /**
   * The indices that the backend will use to search for the document ID.
   */
  indices: string[];

  filters: TimeFilters;

  agentId: string;
}

/**
 * Used by the `data` concern to keep track of related events when showing the 'nodeEventsInCategory' panel.
 */
export interface NodeEventsInCategoryState {
  /**
   * The nodeID that `events` are related to.
   */
  nodeID: string;
  /**
   * The category that `events` have in common.
   */
  eventCategory: string;
  /**
   * Events with `event.category` that include `eventCategory` and that are related to `nodeID`.
   */
  events: SafeResolverEvent[];
  /**
   * The cursor, if any, that can be used to retrieve more events.
   */
  cursor: null | string;

  /**
   * The cursor, if any, that was last used to fetch additional related events.
   */

  lastCursorRequested?: null | string;

  pendingRequest?: {
    /**
     * Parameters used for a request currently in progress.
     */
    parameters: PanelViewAndParameters;
  };

  agentId: string;

  /**
   * Flag for showing an error message when fetching additional related events.
   */
  error?: boolean;
}

/**
 * Return structure for the mock DAL returned by this file.
 */
export interface GeneratedTreeMetadata {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  /**
   * This field holds the nodes created by the resolver generator that make up a resolver graph.
   */
  generatedTree: Tree;
  /**
   * The nodes in this tree are equivalent to those in the generatedTree field. This nodes
   * are just structured in a way that they match the NewResolverTree type. This helps with the
   * Data Access Layer that is expecting to return a NewResolverTree type.
   */
  formattedTree: NewResolverTree;
}

/**
 * The state of the process cubes in the graph.
 *
 * 'running' if the process represented by the node is still running.
 * 'loading' if we don't have the data yet to determine if the node is running or terminated.
 * 'terminated' if the process represented by the node is terminated.
 * 'error' if we were unable to retrieve data associated with the node.
 */
export type NodeDataStatus = 'running' | 'loading' | 'terminated' | 'error';

/**
 * Defines the data structure used by the node data middleware. The middleware creates a map of node IDs to this
 * structure before dispatching the action to the reducer.
 */
export interface FetchedNodeData {
  events: SafeResolverEvent[];
  terminated: boolean;
}

/**
 * NodeData contains information about a node in the resolver graph. For Endpoint
 * graphs, the events will be process lifecycle events.
 */
export interface NodeData {
  events: SafeResolverEvent[];
  /**
   * An indication of the current state for retrieving the data.
   */
  status: NodeDataStatus;
}

/**
 * State for `data` reducer which handles receiving Resolver data from the back-end.
 */
export interface DataState {
  /**
   * Used when the panelView is `nodeEventsInCategory`.
   * Store the `nodeEventsInCategory` data for the current panel view. If the panel view or parameters change, the reducer may delete this.
   * If new data is returned for the panel view, this may be updated.
   */
  readonly nodeEventsInCategory?: NodeEventsInCategoryState;

  /**
   * Used when the panelView is `eventDetail`.
   *
   */
  readonly currentRelatedEvent: {
    loading: boolean;
    data: SafeResolverEvent | null;
  };

  readonly detectedBounds?: TimeFilters;

  readonly overriddenTimeBounds?: TimeFilters;

  readonly tree?: {
    /**
     * The parameters passed from the resolver properties
     */
    readonly currentParameters?: TreeFetcherParameters;

    /**
     * The id used for the pending request, if there is one.
     */
    readonly pendingRequestParameters?: TreeFetcherParameters;
    /**
     * The parameters and response from the last successful request.
     */
    readonly lastResponse?: {
      /**
       * The id used in the request.
       */
      readonly parameters: TreeFetcherParameters;
    } & (
      | {
          /**
           * If a response with a success code was received, this is `true`.
           */
          readonly successful: true;
          /**
           * The NewResolverTree parsed from the response.
           */
          readonly result: NewResolverTree;
          /**
           * The current data source (i.e. endpoint, winlogbeat, etc...)
           */
          readonly dataSource: string;
          /**
           * The Resolver Schema for the current data source
           */
          readonly schema: ResolverSchema;
        }
      | {
          /**
           * If the request threw an exception or the response had a failure code, this will be false.
           */
          readonly successful: false;
        }
    );
  };

  /**
   * An ID that is used to differentiate this Resolver instance from others concurrently running on the same page.
   * Used to prevent collisions in things like query parameters.
   */
  readonly resolverComponentInstanceID?: string;

  readonly indices: string[];

  /**
   * The `search` part of the URL.
   */
  readonly locationSearch?: string;

  /**
   * The additional data for each node in the graph. For an Endpoint graph the data will be
   * process lifecycle events.
   *
   * If a node ID exists in the map it means that node came into view in the graph.
   */
  readonly nodeData?: Map<string, NodeData>;
}

/**
 * Represents an ordered pair. Used for x-y coordinates and the like.
 */
export type Vector2 = [number, number];

/**
 * A rectangle with sides that align with the `x` and `y` axises.
 */
export interface AABB {
  /**
   * Vector whose `x` component represents the minimum side of the box and whose 'y' component represents the maximum side of the box.
   **/
  readonly minimum: Vector2;
  /**
   * Vector who's `x` component is the _right_ side of the `AABB` and who's `y` component is the _bottom_ side of the `AABB`.
   **/
  readonly maximum: Vector2;
}

/**
 * A 2D transformation matrix in row-major order.
 */
export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

type EventSubtypeFull =
  | 'creation_event'
  | 'fork_event'
  | 'exec_event'
  | 'already_running'
  | 'termination_event';

type EventTypeFull = 'process_event';

/**
 * The 'events' which contain process data and are used to model Resolver.
 */
export interface ProcessEvent {
  readonly event_timestamp: number;
  readonly event_type: number;
  readonly machine_id: string;
  readonly data_buffer: {
    timestamp_utc: string;
    event_subtype_full: EventSubtypeFull;
    event_type_full: EventTypeFull;
    node_id: number;
    source_id?: number;
    process_name: string;
    process_path: string;
    signature_status?: string;
  };
}

/**
 * A representation of a process tree with indices for O(1) access to children and values by id.
 */
export interface IndexedProcessTree {
  /**
   * Map of ID to a process's ordered children
   */
  idToChildren: Map<string | undefined, ResolverNode[]>;
  /**
   * Map of ID to process
   */
  idToNode: Map<string, ResolverNode>;
  /**
   * The id of the origin or root node provided by the backend
   */
  originID: string | undefined;
  /**
   * The number of generations from the origin in the tree. If the origin has no descendants, then this value will be
   * zero. The origin of the graph is the analyzed event, not necessarily the root node of the tree.
   *
   * If the originID is not defined then the generations will be undefined.
   */
  generations: number | undefined;
  /**
   * The number of descendants from the origin of the graph. The origin of the graph is the analyzed event, not
   * necessarily the root node of the tree.
   *
   * If the originID is not defined then the descendants will be undefined.
   */
  descendants: number | undefined;
  /**
   * The number of ancestors from the origin of the graph. The amount includes the origin. The origin of the graph is
   * analyzed event.
   *
   * If the originID is not defined the ancestors will be undefined.
   */
  ancestors: number | undefined;
}

/**
 * A map of `ProcessEvents` (representing process nodes) to the 'width' of their subtrees as calculated by `calculateSubgraphWidths`
 */
export type ProcessWidths = Map<ResolverNode, number>;
/**
 * Map of ProcessEvents (representing process nodes) to their positions. Calculated by `calculateNodePositions`
 */
export type NodePositions = Map<ResolverNode, Vector2>;

export type DurationTypes =
  | 'millisecond'
  | 'milliseconds'
  | 'second'
  | 'seconds'
  | 'minute'
  | 'minutes'
  | 'hour'
  | 'hours'
  | 'day'
  | 'days'
  | 'week'
  | 'weeks'
  | 'month'
  | 'months'
  | 'year'
  | 'years';

/**
 * duration value and description string
 */
export interface DurationDetails {
  duration: number | '<1';
  durationType: DurationTypes;
}

/**
 * Values shared between two vertices joined by an edge line.
 */
export interface EdgeLineMetadata {
  /**
   * Represents a time duration for this edge line segment. Used to show a time duration in the UI.
   * This is only ever present on one of the segments in an edge.
   */
  elapsedTime?: DurationDetails;
  /**
   * Used to represent a react key value for the edge line.
   */
  reactKey: string;
}

/**
 * Edge line components including the points joining the edge-line and any optional associated metadata
 */
export interface EdgeLineSegment {
  points: [Vector2, Vector2];
  metadata: EdgeLineMetadata;
}

/**
 * Used to provide pre-calculated info from `calculateSubgraphWidths`. These 'width' values are used in the layout of the graph.
 */
export type ProcessWithWidthMetadata = {
  node: ResolverNode;
  width: number;
} & (
  | {
      parent: ResolverNode;
      parentWidth: number;
      isOnlyChild: boolean;
      firstChildWidth: number;
      lastChildWidth: number;
    }
  | {
      parent: null;
      /* Without a parent, there is no parent width */
      parentWidth: null;
      /* Without a parent, we can't be an only child */
      isOnlyChild: null;
      /** If there is no parent, there are no siblings */
      lastChildWidth: null;
      firstChildWidth: null;
    }
);

/**
 * The constructor for a ResizeObserver
 */
interface ResizeObserverConstructor {
  prototype: ResizeObserver;

  new (callback: ResizeObserverCallback): ResizeObserver;
}

/**
 * Functions that introduce side effects. A React context provides these, and they may be mocked in tests.
 */
export interface SideEffectors {
  /**
   * A function which returns the time since epoch in milliseconds. Injected because mocking Date is tedious.
   */
  timestamp: () => number;
  /**
   * Use instead of `window.requestAnimationFrame`
   **/
  requestAnimationFrame: typeof window.requestAnimationFrame;
  /**
   * Use instead of `window.cancelAnimationFrame`
   **/
  cancelAnimationFrame: typeof window.cancelAnimationFrame;
  /**
   * Use instead of the `ResizeObserver` global.
   */
  ResizeObserver: ResizeObserverConstructor;

  /**
   * Use this instead of the Clipboard API's `writeText` method.
   */
  writeTextToClipboard(text: string): Promise<void>;

  /**
   * Use this instead of `Element.prototype.getBoundingClientRect` .
   */
  getBoundingClientRect(element: Element): DOMRect;
}

export interface SideEffectSimulator {
  /**
   * Control the mock `SideEffectors`.
   */
  controls: {
    /**
     * Set or get the `time` number used for `timestamp` and `requestAnimationFrame` callbacks.
     */
    time: number;
    /**
     * Call any pending `requestAnimationFrame` callbacks.
     */
    provideAnimationFrame: () => void;
    /**
     * Trigger `ResizeObserver` callbacks for `element` and update the mocked value for `getBoundingClientRect`.
     */
    simulateElementResize: (element: Element, contentRect: DOMRect) => void;

    /**
     * Get the most recently written clipboard text. This is only updated when `confirmTextWrittenToClipboard` is called.
     */
    clipboardText: string;

    /**
     * Call this to resolve the promise returned by `writeText`.
     */
    confirmTextWrittenToClipboard: () => void;
  };
  /**
   * Mocked `SideEffectors`.
   */
  mock: SideEffectors;
}

/**
 * The internal types of process events used by resolver, mapped from v0 and v1 events.
 */
export type ResolverProcessType =
  | 'processCreated'
  | 'processRan'
  | 'processTerminated'
  | 'unknownProcessEvent'
  | 'processCausedAlert'
  | 'processLoading'
  | 'processError'
  | 'unknownEvent';

export type ResolverStore = Store<State, AnyAction>;

/**
 * Describes the basic Resolver graph layout.
 */
export interface IsometricTaxiLayout {
  /**
   * A map of events to position. Each event represents its own node.
   */
  processNodePositions: Map<ResolverNode, Vector2>;

  /**
   * A map of edge-line segments, which graphically connect nodes.
   */
  edgeLineSegments: EdgeLineSegment[];

  /**
   * defines the aria levels for nodes.
   */
  ariaLevels: Map<ResolverNode, number>;
}

/**
 * Defines the type for bounding a search by a time box.
 */
export interface TimeRange {
  from: string | number;
  to: string | number;
}

/**
 * An object with methods that can be used to access data from the Kibana server.
 * This is injected into Resolver.
 * This allows tests to provide a mock data access layer.
 * In the future, other implementations of Resolver could provide different data access layers.
 */
export interface DataAccessLayer {
  /**
   * Fetch related events for an entity ID
   */
  relatedEvents: ({
    entityID,
    timeRange,
    indexPatterns,
    agentId,
  }: {
    entityID: string;
    timeRange?: TimeRange;
    indexPatterns: string[];
    agentId: string;
  }) => Promise<ResolverRelatedEvents>;

  /**
   * Return events that have `process.entity_id` that includes `entityID` and that have
   * a `event.category` that includes `category`.
   */
  eventsWithEntityIDAndCategory: ({
    entityID,
    category,
    after,
    timeRange,
    indexPatterns,
    agentId,
  }: {
    entityID: string;
    category: string;
    after?: string;
    timeRange?: TimeRange;
    indexPatterns: string[];
    agentId: string;
  }) => Promise<ResolverPaginatedEvents>;

  /**
   * Retrieves the node data for a set of node IDs. This is specifically for Endpoint graphs. It
   * only returns process lifecycle events.
   */
  nodeData({
    ids,
    timeRange,
    indexPatterns,
    limit,
    agentId,
  }: {
    ids: string[];
    timeRange?: TimeRange;
    indexPatterns: string[];
    limit: number;
    agentId: string;
  }): Promise<SafeResolverEvent[]>;

  /**
   * Return up to one event that has an `event.id` that includes `eventID`.
   */
  event: ({
    nodeID,
    eventCategory,
    eventTimestamp,
    eventID,
    timeRange,
    indexPatterns,
    winlogRecordID,
    agentId,
  }: {
    nodeID: string;
    eventCategory: string[];
    eventTimestamp: string;
    eventID?: string | number;
    winlogRecordID: string;
    timeRange?: TimeRange;
    indexPatterns: string[];
    agentId: string;
  }) => Promise<SafeResolverEvent | null>;

  /**
   * Fetch a resolver graph for a given id.
   */
  resolverTree({
    dataId,
    schema,
    timeRange,
    indices,
    ancestors,
    descendants,
    agentId,
  }: {
    dataId: string;
    schema: ResolverSchema;
    timeRange?: TimeRange;
    indices: string[];
    ancestors: number;
    descendants: number;
    agentId: string;
  }): Promise<ResolverNode[]>;

  /**
   * Get entities matching a document.
   */
  entities: (parameters: {
    /** _id of the document to find an entity in. */
    _id: string;
    /** indices to search in */
    indices: string[];
    /** signal to abort the request */
    signal: AbortSignal;
  }) => Promise<ResolverEntityIndex>;
}

export interface TimeFilters {
  from?: string;
  to?: string;
}

/**
 * The externally provided React props.
 */
export interface ResolverProps {
  /**
   * Used by `styled-components`.
   */
  className?: string;
  /**
   * The `_id` value of an event in ES.
   * Used as the origin of the Resolver graph.
   */
  databaseDocumentID: string;

  /**
   * An ID that is used to differentiate this Resolver instance from others concurrently running on the same page.
   * Used to prevent collisions in things like query parameters.
   */
  resolverComponentInstanceID: string;

  /**
   * Indices that the backend should use to find the originating document.
   */
  indices: string[];

  filters: TimeFilters;

  /**
   * A flag to update data from an external source
   */
  shouldUpdate: boolean;

  /**
   * If true, the details panel is not shown in the graph and a view button is shown to manage the panel visibility.
   */
  isSplitPanel?: boolean;
  showPanelOnClick?: () => void;
}

/**
 * Used by `SpyMiddleware`.
 */
export interface SpyMiddlewareStateActionPair {
  /** An action dispatched, `state` is the state that the reducer returned when handling this action.
   */
  action: AnyAction;
  /**
   * A resolver state that was returned by the reducer when handling `action`.
   */
  state: State;
}

/**
 * A wrapper object that has a middleware along with an async generator that returns the actions dispatched to the store (along with state.)
 */
export interface SpyMiddleware {
  /**
   * A middleware to use with `applyMiddleware`.
   */
  middleware: Middleware<{}, State, Dispatch<AnyAction>>;
  /**
   * A generator that returns all state and action pairs that pass through the middleware.
   */
  actions: () => AsyncGenerator<SpyMiddlewareStateActionPair, never, unknown>;

  /**
   * Prints actions to the console.
   * Call the returned function to stop debugging.
   */
  debugActions: () => () => void;
}

/**
 * values of this type are exposed by the Security Solution plugin's setup phase.
 */
export interface ResolverPluginSetup {
  /**
   * Provide access to the instance of the `react-redux` `Provider` that Resolver recognizes.
   */
  Provider: typeof Provider;
  /**
   * Takes a `DataAccessLayer`, which could be a mock one, and returns an redux Store.
   * All data acess (e.g. HTTP requests) are done through the store.
   */
  storeFactory: (dataAccessLayer: DataAccessLayer) => Store<AnalyzerById, AnyAction>;

  /**
   * The Resolver component without the required Providers.
   * You must wrap this component in: `KibanaRenderContextProvider`, `Router` (from react-router,) `KibanaContextProvider`,
   * and the `Provider` component provided by this object.
   */
  ResolverWithoutProviders: React.MemoExoticComponent<
    React.ForwardRefExoticComponent<ResolverProps & React.RefAttributes<unknown>>
  >;

  /**
   * A collection of mock objects that can be used in examples or in testing.
   */
  mocks: {
    /**
     * Mock `DataAccessLayer`s. All of Resolver's HTTP access is provided by a `DataAccessLayer`.
     */
    dataAccessLayer: {
      /**
       * A mock `DataAccessLayer` that returns a tree that has no ancestor nodes but which has 2 children nodes.
       * The origin has 2 related registry events
       */
      noAncestorsTwoChildrenWithRelatedEventsOnOrigin: () => { dataAccessLayer: DataAccessLayer };
    };
  };
}

/**
 * Parameters to control what panel content is shown. Can be encoded and decoded from the URL using methods in
 * `models/location_search`
 */
export type PanelViewAndParameters =
  | {
      /**
       * The panel will show a index view (e.g. a list) of the nodes.
       */
      panelView: 'nodes';
    }
  | {
      /**
       * The panel will show the details of a single node.
       */
      panelView: 'nodeDetail';
      panelParameters: {
        /**
         * The nodeID (e.g. `process.entity_id`) for the node that will be shown in detail
         */
        nodeID: string;
      };
    }
  | {
      /**
       * The panel will show a index view of the all events related to a specific node.
       * This may show a summary of aggregation of the events related to the node.
       */
      panelView: 'nodeEvents';
      panelParameters: {
        /**
         * The nodeID (e.g. `process.entity_id`) for the node whose events will be shown.
         */
        nodeID: string;
      };
    }
  | {
      /**
       * The panel will show an index view of the events related to a specific node. Only events in a specific category will be shown.
       */
      panelView: 'nodeEventsInCategory';
      panelParameters: {
        /**
         * The nodeID (e.g. `process.entity_id`) for the node whose events will be shown.
         */
        nodeID: string;
        /**
         * A parameter used to filter the events. For example, events that don't contain `eventCategory` in their `event.category` field may be hidden.
         */
        eventCategory: string;
      };
    }
  | {
      /**
       * The panel will show details about a particular event. This is meant as a subview of 'nodeEventsInCategory'.
       */
      panelView: 'eventDetail';
      panelParameters: {
        /**
         * The nodeID (e.g. `process.entity_id`) for the node related to the event being shown.
         */
        nodeID: string;
        /**
         * Used to associate this view (via breadcrumbs) with a parent `nodeEventsInCategory` view.
         * e.g. The user views the `nodeEventsInCategory` panel and follows a link to the `eventDetail` view. The `eventDetail` view can
         * use `eventCategory` to populate breadcrumbs and allow the user to return to the previous view.
         *
         * This cannot be inferred from the event itself, as an event may have any number of eventCategories.
         */
        eventCategory: string;

        /**
         * `event.id` that uniquely identifies the event to show.
         */
        eventID?: string | number;

        /**
         * `event['@timestamp']` that identifies the given timestamp for an event
         */
        eventTimestamp: string;

        /**
         * `winlog.record_id` an ID that unique identifies a winlogbeat sysmon event. This is not a globally unique field
         * and must be coupled with nodeID, category, and timestamp. Once we have runtime fields support we should remove
         * this.
         */
        winlogRecordID: string;
      };
    };
