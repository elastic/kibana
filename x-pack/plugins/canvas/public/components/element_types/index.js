/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, withProps, withState } from 'recompose';
import { connect } from 'react-redux';
import { camelCase } from 'lodash';
import { cloneSubgraphs } from '../../lib/clone_subgraphs';
import * as customElementService from '../../lib/custom_element_service';
import { elementsRegistry } from '../../lib/elements_registry';
import { notify } from '../../lib/notify';
import { selectToplevelNodes } from '../../state/actions/transient';
import { insertNodes, addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { ElementTypes as Component } from './element_types';

const elementTypesState = withState('search', 'setSearch', '');
const customElementsState = withState('customElements', 'setCustomElements', []);
const elementTypeProps = withProps(() => ({ elements: elementsRegistry.toJS() }));

const mapStateToProps = state => ({ pageId: getSelectedPage(state) });

const mapDispatchToProps = dispatch => ({
  selectToplevelNodes: nodes =>
    dispatch(selectToplevelNodes(nodes.filter(e => !e.position.parent).map(e => e.id))),
  insertNodes: (selectedNodes, pageId) => dispatch(insertNodes(selectedNodes, pageId)),
  addElement: pageId => partialElement => dispatch(addElement(pageId, partialElement)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { pageId, ...remainingStateProps } = stateProps;
  const { addElement, insertNodes, selectToplevelNodes } = dispatchProps;
  const { search, setCustomElements } = ownProps;

  return {
    ...remainingStateProps,
    ...ownProps,
    // add built-in element to the page
    addElement: addElement(pageId),
    // add custom element to the page
    addCustomElement: customElement => {
      const { selectedNodes = [] } = JSON.parse(customElement.content) || {};
      const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);
      if (clonedNodes) {
        insertNodes(clonedNodes, pageId); // first clone and persist the new node(s)
        selectToplevelNodes(clonedNodes); // then select the cloned node(s)
      }
    },
    // custom element search
    findCustomElements: async text => {
      try {
        const { customElements } = await customElementService.find(text);
        setCustomElements(customElements);
      } catch (err) {
        notify.error(err, { title: `Couldn't find custom elements` });
      }
    },
    // remove custom element
    removeCustomElement: async id => {
      try {
        await customElementService.remove(id);
        const { customElements } = await customElementService.find(search);
        setCustomElements(customElements);
      } catch (err) {
        notify.error(err, { title: `Couldn't delete custom elements` });
      }
    },
    // update custom element
    updateCustomElement: id => async (name, description, image) => {
      try {
        await customElementService.update(id, {
          name: camelCase(name),
          displayName: name,
          image,
          help: description,
        });
        const { customElements } = await customElementService.find(search);
        setCustomElements(customElements);
      } catch (err) {
        notify.error(err, { title: `Couldn't update custom elements` });
      }
    },
  };
};

export const ElementTypes = compose(
  elementTypesState,
  elementTypeProps,
  customElementsState,
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )
)(Component);

ElementTypes.propTypes = {
  onClose: PropTypes.func,
};
