/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getNodes, getPageById } from '../../../state/selectors/workpad';
import { getZoomScale } from '../../../state/selectors/app';
import {
  elementLayer as elementLayerAction,
  insertNodes as insertNodesAction,
  removeElements,
  setMultiplePositions as setMultiplePositionsAction,
  // @ts-expect-error
} from '../../../state/actions/elements';
// @ts-expect-error
import { selectToplevelNodes as selectToplevelNodesAction } from '../../../state/actions/transient';
import { crawlTree, globalStateUpdater } from '../integration_utils';
import { CANVAS_EMBEDDABLE_CLASSNAME } from '../../../../common/lib';
import {
  InteractiveWorkpadPage,
  InteractiveWorkpadPageProps,
  ElementShape,
} from './interactive_workpad_page';
import { useEventHandlers } from './event_handlers';
import { State, AeroState, CanvasNode } from '../../../../types';
import { WorkpadPageProps } from '../workpad_page';
import { useAeroStore } from './use_aero_store';

// We're putting the state selector in it's own component since it's not pure because it returns new
// instances of the same objects each time.
export const InteractivePage: FC<WorkpadPageProps> = (props) => {
  const { pageId } = props;

  const dispatch = useDispatch();

  const propsFromState = useSelector((state: State) => {
    const selectedToplevelNodes = state.transient.selectedToplevelNodes;
    const nodes = getNodes(state, pageId, false);
    const selectedPrimaryShapeObjects = selectedToplevelNodes
      .map((id) => nodes.find((s) => s.id === id))
      .filter<CanvasNode>((shape): shape is CanvasNode => shape !== undefined);
    const selectedPersistentPrimaryNodes = selectedPrimaryShapeObjects
      .map((shape) =>
        nodes.find((n) => shape && n.id === shape.id) // is it a leaf or a persisted group?
          ? [shape?.id]
          : nodes.filter((s) => s.position.parent === shape?.id).map((s) => s.id)
      )
      .flat();

    const selectedNodeIds = selectedPersistentPrimaryNodes.map(crawlTree(nodes)).flat();
    return {
      state,
      elements: nodes,
      selectedNodes: selectedNodeIds
        .map((id) => nodes.find((s) => s.id === id))
        .filter<CanvasNode>((node): node is CanvasNode => node !== undefined),
      pageStyle: getPageById(state, pageId)?.style,
      zoomScale: getZoomScale(state),
    };
  });

  const insertNodes = useCallback(
    (selectedNodes: CanvasNode[], selectedPageId: string) => {
      dispatch(insertNodesAction(selectedNodes, selectedPageId));
    },
    [dispatch]
  );

  const removeNodes = useCallback(
    (nodeIds: string[], selectedPageId: string) =>
      dispatch(removeElements(nodeIds, selectedPageId)),
    [dispatch]
  );

  const selectToplevelNodes = useCallback(
    (nodes: CanvasNode[]) =>
      dispatch(selectToplevelNodesAction(nodes.filter((e) => !e.position.parent).map((e) => e.id))),
    [dispatch]
  );

  const elementLayer = useCallback(
    (selectedPageId: string, elementId: string, movement: number) =>
      dispatch(elementLayerAction({ pageId: selectedPageId, elementId, movement })),
    [dispatch]
  );

  const setMultiplePositions = useCallback(
    (repositionedNodes: CanvasNode[]) =>
      dispatch(
        setMultiplePositionsAction(
          repositionedNodes.map((node) => ({ ...node, pageId, elementId: node.id }))
        )
      ),
    [dispatch, pageId]
  );

  const updateGlobalState = useCallback(
    (newState: AeroState) => {
      return globalStateUpdater(dispatch, propsFromState.state)(newState);
    },
    [dispatch, propsFromState.state]
  );

  return (
    <AeroStoreLayer
      {...props}
      {...propsFromState}
      insertNodes={insertNodes}
      removeNodes={removeNodes}
      selectToplevelNodes={selectToplevelNodes}
      elementLayer={elementLayer}
      setMultiplePositions={setMultiplePositions}
      updateGlobalState={updateGlobalState}
    />
  );
};

type AeroStoreLayerProps = Pick<
  InteractiveWorkpadPageProps,
  | 'elementLayer'
  | 'selectedNodes'
  | 'pageStyle'
  | 'zoomScale'
  | 'insertNodes'
  | 'removeNodes'
  | 'selectToplevelNodes'
  | 'setMultiplePositions'
> &
  WorkpadPageProps & {
    updateGlobalState: (state: AeroState) => void;
    elements: CanvasNode[];
  };

const AeroStoreLayer: FC<AeroStoreLayerProps> = ({
  height,
  width,
  pageId,
  registerLayout,
  unregisterLayout,
  zoomScale,
  updateGlobalState,
  elementLayer,
  elements,
  ...rest
}) => {
  const aeroStore = useAeroStore({ height, width, pageId });
  const [, setLayoutState] = useState(aeroStore.getCurrentState());
  const [canvasOrigin, saveCanvasOrigin] = useState<undefined | (() => DOMRect)>();

  const commit = useCallback(
    (type, payload) => {
      const newLayoutState = aeroStore.commit(type, payload);

      if (newLayoutState.currentScene.gestureEnd) {
        updateGlobalState(newLayoutState);
      }

      setLayoutState(newLayoutState);
    },
    [aeroStore, updateGlobalState]
  );

  useEffect(() => {
    registerLayout(commit);

    return () => {
      unregisterLayout(commit);
    };
  }, [commit, registerLayout, unregisterLayout]);

  const canDragElement = useCallback(
    (element) => !isEmbeddableBody(element) && isInWorkpad(element),
    []
  );

  const handlers = useEventHandlers({
    commit,
    zoomScale,
    canDragElement,
    canvasOrigin: canvasOrigin || (() => ({ left: 0, top: 0 })),
  });

  const cursor = aeroStore.getCurrentState().currentScene.cursor;

  const elementLookup = new Map(elements.map((element) => [element.id, element]));

  const elementsToRender = aeroStore
    .getCurrentState()
    .currentScene.shapes.map<ElementShape>((shape) => {
      const element = elementLookup.get(shape.id);
      return element
        ? {
            ...shape,
            width: shape.a * 2,
            height: shape.b * 2,
            filter: 'filter' in element ? element.filter : undefined,
          }
        : shape;
    });

  return (
    <InteractiveWorkpadPage
      {...rest}
      {...handlers}
      canvasOrigin={canvasOrigin}
      commit={commit}
      elementLayer={elementLayer}
      elements={elementsToRender}
      height={height}
      pageId={pageId}
      width={width}
      zoomScale={zoomScale}
      cursor={cursor}
      saveCanvasOrigin={saveCanvasOrigin}
    />
  );
};

// Polyfill for browsers (IE11) that don't have element.closest
// From: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
function closest(element: HTMLElement, s: string) {
  let el: HTMLElement | null = element;

  do {
    if (el.matches(s)) {
      return el;
    }
    el = el.parentElement;
  } while (el !== null && el.nodeType === 1);
  return null;
}

// If you interact with an embeddable panel, only the header should be draggable
// This function will determine if an element is an embeddable body or not
const isEmbeddableBody = (element: HTMLElement) => {
  const hasClosest = typeof element.closest === 'function';

  if (hasClosest) {
    return (
      element.closest(`.${CANVAS_EMBEDDABLE_CLASSNAME}`) && !element.closest('.embPanel__header')
    );
  } else {
    return (
      closest(element, `.${CANVAS_EMBEDDABLE_CLASSNAME}`) && !closest(element, '.embPanel__header')
    );
  }
};

// Some elements in an embeddable may be portaled out of the embeddable container.
// We do not want clicks on those to trigger drags, etc, in the workpad. This function
// will check to make sure the clicked item is actually in the container
const isInWorkpad = (element: HTMLElement) => {
  const hasClosest = typeof element.closest === 'function';
  const workpadContainerSelector = '.canvasWorkpadContainer';

  if (hasClosest) {
    return !!element.closest(workpadContainerSelector);
  } else {
    return !!closest(element, workpadContainerSelector);
  }
};
