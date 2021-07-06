/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { compose, withState } from 'recompose';
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
// @ts-expect-error untyped local
import { selectToplevelNodes } from '../../state/actions/transient';
// @ts-expect-error untyped local
import { insertNodes } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../lib/ui_metric';
import {
  SavedElementsModal as Component,
  Props as ComponentProps,
} from './saved_elements_modal.component';
import { State, PositionedElement, CustomElement } from '../../../types';

const customElementAdded = 'elements-custom-added';

interface OwnProps {
  onClose: () => void;
}

interface OwnPropsWithState extends OwnProps {
  customElements: CustomElement[];
  setCustomElements: (customElements: CustomElement[]) => void;
  search: string;
  setSearch: (search: string) => void;
}

interface DispatchProps {
  selectToplevelNodes: (nodes: PositionedElement[]) => void;
  insertNodes: (selectedNodes: PositionedElement[], pageId: string) => void;
}

interface StateProps {
  pageId: string;
}

const mapStateToProps = (state: State): StateProps => ({
  pageId: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  selectToplevelNodes: (nodes: PositionedElement[]) =>
    dispatch(
      selectToplevelNodes(
        nodes
          .filter((e: PositionedElement): boolean => !e.position.parent)
          .map((e: PositionedElement): string => e.id)
      )
    ),
  insertNodes: (selectedNodes: PositionedElement[], pageId: string) =>
    dispatch(insertNodes(selectedNodes, pageId)),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: OwnPropsWithState
): ComponentProps => {
  const { pageId } = stateProps;
  const { onClose, setCustomElements } = ownProps;

  return {
    ...ownProps,
    onElementsChange: (customElements: CustomElement[]) => {
      setCustomElements(customElements);
    },
    // add custom element to the page
    addCustomElement: (customElement: CustomElement) => {
      const { selectedNodes = [] } = JSON.parse(customElement.content) || {};
      const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);
      if (clonedNodes) {
        dispatchProps.insertNodes(clonedNodes, pageId); // first clone and persist the new node(s)
        dispatchProps.selectToplevelNodes(clonedNodes); // then select the cloned node(s)
      }
      onClose();
      trackCanvasUiMetric(METRIC_TYPE.LOADED, customElementAdded);
    },
  };
};

export const SavedElementsModal = compose<ComponentProps, OwnProps>(
  withState('search', 'setSearch', ''),
  withState('customElements', 'setCustomElements', []),
  connect(mapStateToProps, mapDispatchToProps, mergeProps)
)(Component);
