/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from 'ui/storage';
import { connect } from 'react-redux';
import {
  compose,
  withState,
  withHandlers,
  lifecycle,
  withPropsOnChange,
  branch,
  renderComponent,
} from 'recompose';
import { fromExpression } from '@kbn/interpreter/common';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';
import { setExpression, flushContext } from '../../state/actions/elements';
import { getFunctionDefinitions } from '../../lib/function_definitions';
import { getWindow } from '../../lib/get_window';
import { LOCALSTORAGE_AUTOCOMPLETE_ENABLED } from '../../../common/lib/constants';
import { ElementNotSelected } from './element_not_selected';
import { Expression as Component } from './expression';

const storage = new Storage(getWindow().localStorage);

const mapStateToProps = state => ({
  pageId: getSelectedPage(state),
  element: getSelectedElement(state),
  functionDefinitionsPromise: getFunctionDefinitions(state),
});

const mapDispatchToProps = dispatch => ({
  setExpression: (elementId, pageId) => expression => {
    // destroy the context cache
    dispatch(flushContext(elementId));

    // update the element's expression
    dispatch(setExpression(expression, elementId, pageId));
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;
  const allProps = { ...ownProps, ...stateProps, ...dispatchProps };

  if (!element) return allProps;

  const { expression } = element;

  return {
    ...allProps,
    expression,
    setExpression: dispatchProps.setExpression(element.id, pageId),
  };
};

const expressionLifecycle = lifecycle({
  componentWillReceiveProps({ formState, setFormState, expression }) {
    if (this.props.expression !== expression && expression !== formState.expression) {
      setFormState({
        expression,
        dirty: false,
      });
    }
  },
  componentDidMount() {
    const { functionDefinitionsPromise, setFunctionDefinitions } = this.props;
    functionDefinitionsPromise.then(defs => setFunctionDefinitions(defs));
  },
});

export const Expression = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withState('functionDefinitions', 'setFunctionDefinitions', []),
  withState('formState', 'setFormState', ({ expression }) => ({
    expression,
    dirty: false,
  })),
  withState('isAutocompleteEnabled', 'setIsAutocompleteEnabled', () => {
    const setting = storage.get(LOCALSTORAGE_AUTOCOMPLETE_ENABLED);
    return setting === null ? true : setting;
  }),
  withHandlers({
    toggleAutocompleteEnabled: ({ isAutocompleteEnabled, setIsAutocompleteEnabled }) => () => {
      storage.set(LOCALSTORAGE_AUTOCOMPLETE_ENABLED, !isAutocompleteEnabled);
      setIsAutocompleteEnabled(!isAutocompleteEnabled);
    },
    updateValue: ({ setFormState }) => expression => {
      setFormState({
        expression,
        dirty: true,
      });
    },
    setExpression: ({ setExpression, setFormState }) => exp => {
      setFormState(prev => ({
        ...prev,
        dirty: false,
      }));
      setExpression(exp);
    },
  }),
  expressionLifecycle,
  withPropsOnChange(['formState'], ({ formState }) => ({
    error: (function() {
      try {
        // TODO: We should merge the advanced UI input and this into a single validated expression input.
        fromExpression(formState.expression);
        return null;
      } catch (e) {
        return e.message;
      }
    })(),
  })),
  branch(props => !props.element, renderComponent(ElementNotSelected))
)(Component);
