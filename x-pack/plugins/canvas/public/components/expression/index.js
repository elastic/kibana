/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import { withKibana } from '../../../../../../src/plugins/kibana_react/public';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';
import { setExpression, flushContext } from '../../state/actions/elements';
import { ElementNotSelected } from './element_not_selected';
import { Expression as Component } from './expression';

const mapStateToProps = (state) => ({
  pageId: getSelectedPage(state),
  element: getSelectedElement(state),
});

const mapDispatchToProps = (dispatch) => ({
  setExpression: (elementId, pageId) => (expression) => {
    // destroy the context cache
    dispatch(flushContext(elementId));

    // update the element's expression
    dispatch(setExpression(expression, elementId, pageId));
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId } = stateProps;
  const allProps = { ...ownProps, ...stateProps, ...dispatchProps };

  if (!element) {
    return allProps;
  }

  const { expression } = element;

  const functions = Object.values(allProps.kibana.services.expressions.getFunctions());

  return {
    ...allProps,
    expression,
    functionDefinitions: functions,
    setExpression: dispatchProps.setExpression(element.id, pageId),
  };
};

const expressionLifecycle = lifecycle({
  componentDidUpdate({ expression }) {
    if (
      this.props.expression !== expression &&
      this.props.expression !== this.props.formState.expression
    ) {
      this.props.setFormState({
        expression: this.props.expression,
        dirty: false,
      });
    }
  },
});

export const Expression = compose(
  withKibana,
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('formState', 'setFormState', ({ expression }) => ({
    expression,
    dirty: false,
  })),
  withState('isCompact', 'setCompact', true),
  withHandlers({
    toggleCompactView: ({ isCompact, setCompact }) => () => {
      setCompact(!isCompact);
    },
    updateValue: ({ setFormState }) => (expression) => {
      setFormState({
        expression,
        dirty: true,
      });
    },
    setExpression: ({ setExpression, setFormState }) => (exp) => {
      setFormState((prev) => ({
        ...prev,
        dirty: false,
      }));
      setExpression(exp);
    },
  }),
  expressionLifecycle,
  withPropsOnChange(['formState'], ({ formState }) => ({
    error: (function () {
      try {
        // TODO: We should merge the advanced UI input and this into a single validated expression input.
        fromExpression(formState.expression);
        return null;
      } catch (e) {
        return e.message;
      }
    })(),
  })),
  branch((props) => !props.element, renderComponent(ElementNotSelected))
)(Component);
