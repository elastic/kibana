/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withHandlers, withProps } from 'recompose';
import { Dispatch } from 'redux';
import { State, PositionedElement } from '../../../../types';
import { getClipboardData } from '../../../lib/clipboard';
// @ts-expect-error untyped local
import { flatten } from '../../../lib/aeroelastic/functional';
// @ts-expect-error untyped local
import { globalStateUpdater } from '../../workpad_page/integration_utils';
// @ts-expect-error untyped local
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
import { EditMenu as Component, Props as ComponentProps } from './edit_menu';

type LayoutState = any;

type CommitFn = (type: string, payload: any) => LayoutState;

interface OwnProps {
  commit: CommitFn;
}

const withGlobalState = (
  commit: CommitFn,
  updateGlobalState: (layoutState: LayoutState) => void
) => (type: string, payload: any) => {
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
  const nodes = getNodes(state, pageId) as PositionedElement[];
  const selectedToplevelNodes = getSelectedToplevelNodes(state);

  const selectedPrimaryShapeObjects = selectedToplevelNodes
    .map((id: string) => nodes.find((s: PositionedElement) => s.id === id))
    .filter((shape?: PositionedElement) => shape) as PositionedElement[];

  const selectedPersistentPrimaryNodes = flatten(
    selectedPrimaryShapeObjects.map((shape: PositionedElement) =>
      nodes.find((n: PositionedElement) => n.id === shape.id) // is it a leaf or a persisted group?
        ? [shape.id]
        : nodes.filter((s: PositionedElement) => s.position.parent === shape.id).map((s) => s.id)
    )
  );

  const selectedNodeIds: string[] = flatten(selectedPersistentPrimaryNodes.map(crawlTree(nodes)));
  const selectedNodes = selectedNodeIds
    .map((id: string) => nodes.find((s) => s.id === id))
    .filter((node: PositionedElement | undefined): node is PositionedElement => {
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
  insertNodes: (selectedNodes: PositionedElement[], pageId: string) =>
    dispatch(insertNodes(selectedNodes, pageId)),
  removeNodes: (nodeIds: string[], pageId: string) => dispatch(removeElements(nodeIds, pageId)),
  selectToplevelNodes: (nodes: PositionedElement[]) =>
    dispatch(
      selectToplevelNodes(
        nodes.filter((e: PositionedElement) => !e.position.parent).map((e) => e.id)
      )
    ),
  elementLayer: (pageId: string, elementId: string, movement: number) => {
    dispatch(elementLayer({ pageId, elementId, movement }));
  },
  undoHistory: () => dispatch(undoHistory()),
  redoHistory: () => dispatch(redoHistory()),
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

export const EditMenu = compose<ComponentProps, OwnProps>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withProps(() => ({ hasPasteData: Boolean(getClipboardData()) })),
  withHandlers(basicHandlerCreators),
  withHandlers(clipboardHandlerCreators),
  withHandlers(layerHandlerCreators),
  withHandlers(groupHandlerCreators),
  withHandlers(alignmentDistributionHandlerCreators)
)(Component);
