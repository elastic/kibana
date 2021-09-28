/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext } from 'react';
import { connect } from 'react-redux';
import { compose, withHandlers, withProps } from 'recompose';
import { Dispatch } from 'redux';
import { State, CanvasNodeWithAst } from '../../../../types';
import { getClipboardData } from '../../../lib/clipboard';
// @ts-expect-error untyped local
import { flatten } from '../../../lib/aeroelastic/functional';
import { globalStateUpdater } from '../../workpad_page/integration_utils';
import { crawlTree } from '../../workpad_page/integration_utils';
// @ts-expect-error untyped local
import { insertNodes, elementLayer, removeElements } from '../../../state/actions/elements';
// @ts-expect-error untyped local
import { undoHistory, redoHistory } from '../../../state/actions/history';
// @ts-expect-error untyped local
import { selectToplevelNodes } from '../../../state/actions/transient';
import {
  getSelectedPage,
  getNodes,
  getSelectedToplevelNodes,
} from '../../../state/selectors/workpad';
import {
  layerHandlerCreators,
  clipboardHandlerCreators,
  basicHandlerCreators,
  groupHandlerCreators,
  alignmentDistributionHandlerCreators,
} from '../../../lib/element_handler_creators';
import { EditMenu as Component, Props as ComponentProps } from './edit_menu.component';
import { WorkpadRoutingContext } from '../../../routes/workpad';

type LayoutState = any;

type CommitFn = (type: string, payload: any) => LayoutState;

interface OwnProps {
  commit: CommitFn;
}

const withGlobalState =
  (commit: CommitFn, updateGlobalState: (layoutState: LayoutState) => void) =>
  (type: string, payload: any) => {
    const newLayoutState = commit(type, payload);
    if (newLayoutState.currentScene.gestureEnd) {
      updateGlobalState(newLayoutState);
    }
  };

/*
 * TODO: this is all copied from interactive_workpad_page and workpad_shortcuts
 */
const mapStateToProps = (state: State) => {
  const pageId = getSelectedPage(state);
  const nodes = getNodes(state, pageId);
  const selectedToplevelNodes = getSelectedToplevelNodes(state);

  const selectedPrimaryShapeObjects = selectedToplevelNodes
    .map((id: string) => nodes.find((s) => s.id === id))
    .filter<CanvasNodeWithAst>((shape): shape is CanvasNodeWithAst => shape !== undefined);

  const selectedPersistentPrimaryNodes = selectedPrimaryShapeObjects
    .map((shape) =>
      nodes.find((n) => n.id === shape.id) // is it a leaf or a persisted group?
        ? [shape.id]
        : nodes.filter((s) => s.position.parent === shape.id).map((s) => s.id)
    )
    .flat();

  const selectedNodeIds: string[] = flatten(selectedPersistentPrimaryNodes.map(crawlTree(nodes)));
  const selectedNodes = selectedNodeIds
    .map((id: string) => nodes.find((s) => s.id === id))
    .filter<CanvasNodeWithAst>((node): node is CanvasNodeWithAst => {
      return !!node;
    });

  return {
    pageId,
    selectedToplevelNodes,
    selectedNodes,
    state,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  insertNodes: (selectedNodes: CanvasNodeWithAst[], pageId: string) =>
    dispatch(insertNodes(selectedNodes, pageId)),
  removeNodes: (nodeIds: string[], pageId: string) => dispatch(removeElements(nodeIds, pageId)),
  selectToplevelNodes: (nodes: CanvasNodeWithAst[]) =>
    dispatch(
      selectToplevelNodes(
        nodes.filter((e: CanvasNodeWithAst) => !e.position.parent).map((e) => e.id)
      )
    ),
  elementLayer: (pageId: string, elementId: string, movement: number) => {
    dispatch(elementLayer({ pageId, elementId, movement }));
  },
  dispatch,
});

const mergeProps = (
  { state, selectedToplevelNodes, ...restStateProps }: ReturnType<typeof mapStateToProps>,
  { dispatch, ...restDispatchProps }: ReturnType<typeof mapDispatchToProps>,
  { commit }: OwnProps
) => {
  const updateGlobalState = globalStateUpdater(dispatch, state);

  return {
    ...restDispatchProps,
    ...restStateProps,
    commit: withGlobalState(commit, updateGlobalState),
    groupIsSelected:
      selectedToplevelNodes.length === 1 && selectedToplevelNodes[0].includes('group'),
  };
};

export const EditMenuWithContext: FC<ComponentProps> = (props) => {
  const { undo, redo } = useContext(WorkpadRoutingContext);

  return <Component {...props} undoHistory={undo} redoHistory={redo} />;
};

export const EditMenu = compose<ComponentProps, OwnProps>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withProps(() => ({ hasPasteData: Boolean(getClipboardData()) })),
  withHandlers(basicHandlerCreators),
  withHandlers(clipboardHandlerCreators),
  withHandlers(layerHandlerCreators),
  withHandlers(groupHandlerCreators),
  withHandlers(alignmentDistributionHandlerCreators)
)(EditMenuWithContext);
