/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withHandlers } from 'recompose';
import { insertNodes, elementLayer, removeElements } from '../../state/actions/elements';
import { getSelectedPage, getNodes, getSelectedToplevelNodes } from '../../state/selectors/workpad';
import { flatten } from '../../lib/aeroelastic/functional';
import {
  layerHandlerCreators,
  clipboardHandlerCreators,
  basicHandlerCreators,
} from '../../lib/element_handler_creators';
import { crawlTree } from '../workpad_page/integration_utils';
import { selectToplevelNodes } from './../../state/actions/transient';
import { SidebarHeader as Component } from './sidebar_header';

/*
 * TODO: this is all copied from interactive_workpad_page and workpad_shortcuts
 */
const mapStateToProps = state => {
  const pageId = getSelectedPage(state);
  const nodes = getNodes(state, pageId);
  const selectedToplevelNodes = getSelectedToplevelNodes(state);
  const selectedPrimaryShapeObjects = selectedToplevelNodes
    .map(id => nodes.find(s => s.id === id))
    .filter(shape => shape);
  const selectedPersistentPrimaryNodes = flatten(
    selectedPrimaryShapeObjects.map(shape =>
      nodes.find(n => n.id === shape.id) // is it a leaf or a persisted group?
        ? [shape.id]
        : nodes.filter(s => s.parent === shape.id).map(s => s.id)
    )
  );
  const selectedNodeIds = flatten(selectedPersistentPrimaryNodes.map(crawlTree(nodes)));

  return {
    pageId,
    selectedNodes: selectedNodeIds.map(id => nodes.find(s => s.id === id)),
  };
};

const mapDispatchToProps = dispatch => ({
  insertNodes: (selectedNodes, pageId) => dispatch(insertNodes(selectedNodes, pageId)),
  removeNodes: (nodeIds, pageId) => dispatch(removeElements(nodeIds, pageId)),
  selectToplevelNodes: nodes =>
    dispatch(selectToplevelNodes(nodes.filter(e => !e.position.parent).map(e => e.id))),
  elementLayer: (pageId, elementId, movement) => {
    dispatch(elementLayer({ pageId, elementId, movement }));
  },
});

export const SidebarHeader = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withHandlers(basicHandlerCreators),
  withHandlers(clipboardHandlerCreators),
  withHandlers(layerHandlerCreators)
  // TODO: restore when group and ungroup can be triggered outside of workpad_page
  // withHandlers(groupHandlerCreators),
)(Component);
