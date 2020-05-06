/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';
import { withState, withHandlers, compose } from 'recompose';
import { get } from 'lodash';
import { datasourceRegistry } from '../../expression_types';
import { getServerFunctions } from '../../state/selectors/app';
import { getSelectedElement, getSelectedPage } from '../../state/selectors/workpad';
import { setArgumentAtIndex, setAstAtIndex, flushContext } from '../../state/actions/elements';
import { Datasource as Component } from './datasource';

const mapStateToProps = state => ({
  element: getSelectedElement(state),
  pageId: getSelectedPage(state),
  functionDefinitions: getServerFunctions(state),
});

const mapDispatchToProps = dispatch => ({
  dispatchArgumentAtIndex: props => arg => dispatch(setArgumentAtIndex({ ...props, arg })),
  dispatchAstAtIndex: ({ index, element, pageId }) => ast => {
    dispatch(flushContext(element.id));
    dispatch(setAstAtIndex(index, ast, element, pageId));
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { element, pageId, functionDefinitions } = stateProps;
  const { dispatchArgumentAtIndex, dispatchAstAtIndex } = dispatchProps;

  const getDataTableFunctionsByName = name =>
    functionDefinitions.find(fn => fn.name === name && fn.type === 'datatable');

  // find the matching datasource from the expression AST
  const datasourceAst = get(element, 'ast.chain', [])
    .map((astDef, i) => {
      // if it's not a function, it's can't be a datasource
      if (astDef.type !== 'function') {
        return;
      }
      const args = astDef.arguments;

      // if there's no matching datasource in the registry, we're done
      const datasource = datasourceRegistry.get(astDef.function);
      if (!datasource) {
        return;
      }

      const datasourceDef = getDataTableFunctionsByName(datasource.name);

      // keep track of the ast, the ast index2, and the datasource
      return {
        datasource,
        datasourceDef,
        args,
        expressionIndex: i,
      };
    })
    .filter(Boolean)[0];

  return {
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    ...datasourceAst,
    datasources: datasourceRegistry.toArray(),
    setDatasourceAst: dispatchAstAtIndex({
      pageId,
      element,
      index: datasourceAst && datasourceAst.expressionIndex,
    }),
    setDatasourceArgs: dispatchArgumentAtIndex({
      pageId,
      element,
      index: datasourceAst && datasourceAst.expressionIndex,
    }),
  };
};

export const Datasource = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('stateArgs', 'updateArgs', ({ args }) => args),
  withState('selecting', 'setSelecting', false),
  withState('previewing', 'setPreviewing', false),
  withState('isInvalid', 'setInvalid', false),
  withState('stateDatasource', 'selectDatasource', ({ datasource }) => datasource),
  withHandlers({
    resetArgs: ({ updateArgs, args }) => () => updateArgs(args),
  })
)(Component);

Datasource.propTypes = {
  done: PropTypes.func,
};
