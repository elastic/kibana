/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
import { insertNodes, elementLayer } from '../../state/actions/elements';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';
import { selectElement } from './../../state/actions/transient';

import { Sidebar as Component } from './sidebar';

const mapStateToProps = state => ({
  selectedPage: getSelectedPage(state),
  selectedElement: getSelectedElement(state),
});

const mapDispatchToProps = dispatch => ({
  duplicateElement: (pageId, selectedElement) => () => {
    // gradually unifying code with copy/paste
    // todo: more unification w/ copy/paste; group cloning
    const newElements = cloneSubgraphs([selectedElement]);
    dispatch(insertNodes(newElements, pageId));
    dispatch(selectElement(newElements[0].id));
  },
  elementLayer: (pageId, selectedElement) => movement =>
    dispatch(
      elementLayer({
        pageId,
        elementId: selectedElement.id,
        movement,
      })
    ),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { selectedElement, selectedPage } = stateProps;

  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    elementIsSelected: Boolean(selectedElement),
    duplicateElement: dispatchProps.duplicateElement(selectedPage, selectedElement),
    elementLayer: dispatchProps.elementLayer(selectedPage, selectedElement),
  };
};

export const Sidebar = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(Component);
