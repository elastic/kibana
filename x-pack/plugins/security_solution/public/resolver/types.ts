/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-duplicate-imports */
import type React from 'react';
import { Store } from 'redux';
import { Middleware, Dispatch } from 'redux';
import { BBox } from 'rbush';
import { Provider } from 'react-redux';
import { ResolverAction } from './store/actions';
import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
  SafeResolverEvent,
  ResolverPaginatedEvents,
} from '../../common/endpoint/types';

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
export type IndexedEntity = IndexedEdgeLineSegment | IndexedProcessNode;

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
export interface IndexedProcessNode extends BBox {
  type: 'processNode';
  entity: SafeResolverEvent;
  position: Vector2;
}

/**
 * A type describing the shape of section titles and entries for description lists
 */
export type SectionData = Array<{
  sectionTitle: string;
  entries: Array<{ title: string; description: string }>;
}>;

/**
 * The two query parameters we read/write on to control which view the table presents:
 */
export interface CrumbInfo {
  crumbId: string;
  crumbEvent: string;
}

/**
 * A type containing all things to actually be rendered to the DOM.
 */
export interface VisibleEntites {
  processNodePositions: ProcessPositions;
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

  /**
   * Flag for showing an error message when fetching additional related events.
   */
  error?: boolean;
}

export enum NodeDataRequestStatus {
  Requested,
  Received,
  Error,
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
  status: 'requested' | 'received' | 'error';
}

/**
 * Convenience type for map of node ID to it's data.
 */
export type IDToNodeInfo = Map<string, NodeData>;

/**
 * State for `data` reducer which handles receiving Resolver data from the back-end.
 */
export interface DataState {
  /**
   * @deprecated Use the API
   */
  readonly relatedEvents: Map<string, ResolverRelatedEvents>;

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
           * The ResolverTree parsed from the response.
           */
          readonly result: ResolverTree;
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
  readonly nodeData?: IDToNodeInfo;
}

/**
 * Represents an ordered pair. Used for x-y coordinates and the like.
 */
export type Vector2 = readonly [number, number];

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
  idToChildren: Map<string | undefined, SafeResolverEvent[]>;
  /**
   * Map of ID to process
   */
  idToProcess: Map<string, SafeResolverEvent>;
}

/**
 * A map of `ProcessEvents` (representing process nodes) to the 'width' of their subtrees as calculated by `widthsOfProcessSubtrees`
 */
export type ProcessWidths = Map<SafeResolverEvent, number>;
/**
 * Map of ProcessEvents (representing process nodes) to their positions. Calculated by `processPositions`
 */
export type ProcessPositions = Map<SafeResolverEvent, Vector2>;

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
 * Used to provide pre-calculated info from `widthsOfProcessSubtrees`. These 'width' values are used in the layout of the graph.
 */
export type ProcessWithWidthMetadata = {
  process: SafeResolverEvent;
  width: number;
} & (
  | {
      parent: SafeResolverEvent;
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
  | 'unknownEvent';

export type ResolverStore = Store<ResolverState, ResolverAction>;

/**
 * Describes the basic Resolver graph layout.
 */
export interface IsometricTaxiLayout {
  /**
   * A map of events to position. Each event represents its own node.
   */
  processNodePositions: Map<SafeResolverEvent, Vector2>;

  /**
   * A map of edge-line segments, which graphically connect nodes.
   */
  edgeLineSegments: EdgeLineSegment[];

  /**
   * defines the aria levels for nodes.
   */
  ariaLevels: Map<SafeResolverEvent, number>;
}

/**
 * Defines the type for bounding a search by a time box.
 */
export interface Timerange {
  from: Date;
  to: Date;
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
    timerange,
    indexPatterns,
  }: {
    entityID: string;
    timerange: Timerange;
    indexPatterns: string[];
  }) => Promise<ResolverRelatedEvents>;

  /**
   * Return events that have `process.entity_id` that includes `entityID` and that have
   * a `event.category` that includes `category`.
   */
  eventsWithEntityIDAndCategory: ({
    entityID,
    category,
    after,
    timerange,
    indexPatterns,
  }: {
    entityID: string;
    category: string;
    after?: string;
    timerange: Timerange;
    indexPatterns: string[];
  }) => Promise<ResolverPaginatedEvents>;

  /**
   * Retrieves the node data for a set of node IDs. This is specifically for Endpoint graphs. It
   * only returns process lifecycle events.
   */
  nodeData({
    ids,
    timerange,
    indexPatterns,
    limit,
  }: {
    ids: string[];
    timerange: Timerange;
    indexPatterns: string[];
    limit: number;
  }): Promise<SafeResolverEvent[]>;

  /**
   * Return up to one event that has an `event.id` that includes `eventID`.
   */
  event: ({
    eventID,
    timerange,
    indexPatterns,
  }: {
    eventID: string;
    timerange: Timerange;
    indexPatterns: string[];
  }) => Promise<SafeResolverEvent | null>;

  /**
   * Fetch a ResolverTree for a entityID
   */
  resolverTree: (entityID: string, signal: AbortSignal) => Promise<ResolverTree>;

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
}

/**
 * Used by `SpyMiddleware`.
 */
export interface SpyMiddlewareStateActionPair {
  /** An action dispatched, `state` is the state that the reducer returned when handling this action.
   */
  action: ResolverAction;
  /**
   * A resolver state that was returned by the reducer when handling `action`.
   */
  state: ResolverState;
}

/**
 * A wrapper object that has a middleware along with an async generator that returns the actions dispatched to the store (along with state.)
 */
export interface SpyMiddleware {
  /**
   * A middleware to use with `applyMiddleware`.
   */
  middleware: Middleware<{}, ResolverState, Dispatch<ResolverAction>>;
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
  storeFactory: (dataAccessLayer: DataAccessLayer) => Store<ResolverState, ResolverAction>;

  /**
   * The Resolver component without the required Providers.
   * You must wrap this component in: `I18nProvider`, `Router` (from react-router,) `KibanaContextProvider`,
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
        eventID: string;
      };
    };
