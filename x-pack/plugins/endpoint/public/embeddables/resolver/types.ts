/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { ResolverAction } from './actions';

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
}

interface PanningState {
  /**
   * Screen coordinate vector representing the starting point when panning.
   */
  readonly origin: Vector2;

  /**
   * Screen coordinate vector representing the current point when panning.
   */
  readonly currentOffset: Vector2;
}

/**
 * Redux state for the virtual 'camera' used by Resolver.
 */
export interface CameraState {
  /**
   * Contains the starting and current position of the pointer when the user is panning the map.
   */
  readonly panning?: PanningState;

  /**
   * Scales the coordinate system, used for zooming.
   */
  readonly scaling: Vector2;

  /**
   * The size (in pixels) of the Resolver component.
   */
  readonly rasterSize: Vector2;

  /**
   * The camera world transform not counting any change from panning. When panning finishes, this value is updated to account for it.
   * Use the `transform` selector to get the transform adjusted for panning.
   */
  readonly translationNotCountingCurrentPanning: Vector2;

  /**
   * The world coordinates that the pointing device was last over. This is used during mousewheel zoom.
   */
  readonly latestFocusedWorldCoordinates: Vector2 | null;
}

/**
 * State for `data` reducer which handles receiving Resolver data from the backend.
 */
export interface DataState {
  readonly results: readonly ProcessEvent[];
}

export type Vector2 = readonly [number, number];

export type Vector3 = readonly [number, number, number];

/**
 * A rectangle with sides that align with the `x` and `y` axises.
 */
export interface AABB {
  /**
   * Vector who's `x` component is the _left_ side of the AABB and who's `y` component is the _bottom_ side of the AABB.
   **/
  readonly minimum: Vector2;
  /**
   * Vector who's `x` component is the _right_ side of the AABB and who's `y` component is the _bottom_ side of the AABB.
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

type eventSubtypeFull =
  | 'creation_event'
  | 'fork_event'
  | 'exec_event'
  | 'already_running'
  | 'termination_event';

type eventTypeFull = 'process_event';

/**
 * The 'events' which contain process data and are used to model Resolver.
 */
export interface ProcessEvent {
  readonly event_timestamp: number;
  readonly event_type: number;
  readonly machine_id: string;
  readonly data_buffer: {
    event_subtype_full: eventSubtypeFull;
    event_type_full: eventTypeFull;
    node_id: number;
    source_id?: number;
    process_name: string;
    process_path: string;
  };
}

/**
 * A represention of a process tree with indices for O(1) access to children and values by id.
 */
export interface IndexedProcessTree {
  /**
   * Map of ID to a process's children
   */
  idToChildren: Map<number | undefined, ProcessEvent[]>;
  /**
   * Map of ID to process
   */
  idToProcess: Map<number, ProcessEvent>;
}

/**
 * A map of ProcessEvents (representing process nodes) to the 'width' of their subtrees as calculated by `widthsOfProcessSubtrees`
 */
export type ProcessWidths = Map<ProcessEvent, number>;
/**
 * Map of ProcessEvents (representing process nodes) to their positions. Calculated by `processPositions`
 */
export type ProcessPositions = Map<ProcessEvent, Vector2>;
/**
 * An array of vectors2 forming an polyline. Used to connect process nodes in the graph.
 */
export type EdgeLineSegment = Vector2[];

/**
 * Used to provide precalculated info from `widthsOfProcessSubtrees`. These 'width' values are used in the layout of the graph.
 */
export type ProcessWithWidthMetadata = {
  process: ProcessEvent;
  width: number;
} & (
  | {
      parent: ProcessEvent;
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
