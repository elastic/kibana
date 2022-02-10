/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import immutable from 'object-path-immutable';
import { get, pick, cloneDeep, without, last } from 'lodash';
import { toExpression, safeElementFromExpression } from '@kbn/interpreter';
import { createThunk } from '../../lib/create_thunk';
import {
  getPages,
  getWorkpadVariablesAsObject,
  getNodeById,
  getNodes,
  getSelectedPageIndex,
} from '../selectors/workpad';
import { getValue as getResolvedArgsValue } from '../selectors/resolved_args';
import { getDefaultElement } from '../defaults';
import { ErrorStrings } from '../../../i18n';
import { subMultitree } from '../../lib/aeroelastic/functional';
import { pluginServices } from '../../services';
import { selectToplevelNodes } from './transient';
import * as args from './resolved_args';

const { actionsElements: strings } = ErrorStrings;

const { set, del } = immutable;

export function getSiblingContext(state, elementId, checkIndex, path = ['ast.chain']) {
  const prevContextPath = [elementId, 'expressionContext', ...path, checkIndex];
  const prevContextValue = getResolvedArgsValue(state, prevContextPath);

  // if a value is found, return it, along with the index it was found at
  if (prevContextValue != null) {
    return {
      index: checkIndex,
      context: prevContextValue,
    };
  }

  // check previous index while we're still above 0
  const prevContextIndex = checkIndex - 1;
  if (prevContextIndex < 0) {
    return {};
  }

  // walk back up to find the closest cached context available
  return getSiblingContext(state, elementId, prevContextIndex, path);
}

function getBareElement(el, includeId = false) {
  const props = ['position', 'expression', 'filter'];
  if (includeId) {
    return pick(el, props.concat('id'));
  }
  return cloneDeep(pick(el, props));
}

export const elementLayer = createAction('elementLayer');

export const setMultiplePositions = createAction('setMultiplePosition', (repositionedElements) => ({
  repositionedElements,
}));

export const flushContext = createAction('flushContext');
export const flushContextAfterIndex = createAction('flushContextAfterIndex');

export const fetchContext = createThunk(
  'fetchContext',
  ({ dispatch, getState }, index, element, fullRefresh = false, path) => {
    const pathToTarget = [...path.split('.'), 'chain'];
    const chain = get(element, pathToTarget);
    const invalidIndex = chain ? index >= chain.length : true;

    if (!element || !chain || invalidIndex) {
      throw new Error(strings.getInvalidArgIndexErrorMessage(index));
    }

    // cache context as the previous index
    const contextIndex = index - 1;
    const contextPath = [element.id, 'expressionContext', path, contextIndex];

    // set context state to loading
    dispatch(args.setLoading({ path: contextPath }));

    // function to walk back up to find the closest context available
    const getContext = () => getSiblingContext(getState(), element.id, contextIndex - 1, [path]);
    const { index: prevContextIndex, context: prevContextValue } =
      fullRefresh !== true ? getContext() : {};

    // modify the ast chain passed to the interpreter
    const astChain = chain.filter((exp, i) => {
      if (prevContextValue != null) {
        return i > prevContextIndex && i < index;
      }
      return i < index;
    });

    const variables = getWorkpadVariablesAsObject(getState());

    const { expressions } = pluginServices.getServices();
    const elementWithNewAst = set(element, pathToTarget, astChain);

    // get context data from a partial AST
    return expressions
      .interpretAst(elementWithNewAst.ast, variables, prevContextValue)
      .then((value) => {
        dispatch(args.setValue({ path: contextPath, value }));
      });
  }
);

const fetchRenderableWithContextFn = ({ dispatch, getState }, element, ast, context) => {
  const argumentPath = [element.id, 'expressionRenderable'];
  dispatch(
    args.setLoading({
      path: argumentPath,
    })
  );

  const getAction = (renderable) =>
    args.setValue({
      path: argumentPath,
      value: renderable,
    });

  const variables = getWorkpadVariablesAsObject(getState());
  const { expressions, notify } = pluginServices.getServices();
  return expressions
    .runInterpreter(ast, context, variables, { castToRender: true })
    .then((renderable) => {
      dispatch(getAction(renderable));
    })
    .catch((err) => {
      notify.error(err);
      dispatch(getAction(err));
    });
};

export const fetchRenderableWithContext = createThunk(
  'fetchRenderableWithContext',
  fetchRenderableWithContextFn
);

export const fetchRenderable = createThunk('fetchRenderable', ({ dispatch }, element) => {
  const ast = element.ast || safeElementFromExpression(element.expression);

  dispatch(fetchRenderableWithContext(element, ast, null));
});

export const fetchAllRenderables = createThunk(
  'fetchAllRenderables',
  ({ dispatch, getState }, { onlyActivePage = false } = {}) => {
    const workpadPages = getPages(getState());
    const currentPageIndex = getSelectedPageIndex(getState());

    const currentPage = workpadPages[currentPageIndex];
    const otherPages = without(workpadPages, currentPage);

    dispatch(args.inFlightActive());

    function fetchElementsOnPages(pages) {
      const elements = [];
      pages.forEach((page) => {
        page.elements.forEach((element) => {
          elements.push(element);
        });
      });

      const renderablePromises = elements.map((element) => {
        const ast = element.ast || safeElementFromExpression(element.expression);
        const argumentPath = [element.id, 'expressionRenderable'];

        const variables = getWorkpadVariablesAsObject(getState());
        const { expressions, notify } = pluginServices.getServices();

        return expressions
          .runInterpreter(ast, null, variables, { castToRender: true })
          .then((renderable) => ({ path: argumentPath, value: renderable }))
          .catch((err) => {
            notify.error(err);
            return { path: argumentPath, value: err };
          });
      });

      return Promise.all(renderablePromises).then((renderables) => {
        dispatch(args.setValues(renderables));
      });
    }

    if (onlyActivePage) {
      fetchElementsOnPages([currentPage]).then(() => dispatch(args.inFlightComplete()));
    } else {
      fetchElementsOnPages([currentPage])
        .then(() => {
          return otherPages.reduce((chain, page) => {
            return chain.then(() => fetchElementsOnPages([page]));
          }, Promise.resolve());
        })
        .then(() => dispatch(args.inFlightComplete()));
    }
  }
);

export const insertNodes = createThunk('insertNodes', ({ dispatch, type }, elements, pageId) => {
  const _insertNodes = createAction(type);
  const newElements = elements.map(cloneDeep);
  // move the root element so users can see that it was added
  newElements.forEach((newElement) => {
    newElement.position.top = newElement.position.top + 10;
    newElement.position.left = newElement.position.left + 10;
  });
  dispatch(_insertNodes({ pageId, elements: newElements }));

  // refresh all elements just once per `insertNodes call` if there's a filter on any, otherwise just render the new element
  if (elements.some((element) => element.filter)) {
    dispatch(fetchAllRenderables());
  } else {
    newElements.forEach((newElement) => dispatch(fetchRenderable(newElement)));
  }
});

export const removeElements = createThunk(
  'removeElements',
  ({ dispatch, getState }, rootElementIds, pageId) => {
    const state = getState();

    // todo consider doing the group membership collation in aeroelastic, or the Redux reducer, when adding templates
    const allElements = getNodes(state, pageId);
    const allRoots = rootElementIds
      .map((id) => allElements.find((e) => id === e.id))
      .filter((d) => d);
    const elementIds = subMultitree(
      (e) => e.id,
      (e) => e.position.parent,
      allElements,
      allRoots
    ).map((e) => e.id);

    const shouldRefresh = elementIds.some((elementId) => {
      const element = getNodeById(state, elementId, pageId);
      const filterIsApplied = element.filter && element.filter.length > 0;
      return filterIsApplied;
    });

    const _removeElements = createAction('removeElements', (elementIds, pageId) => ({
      elementIds,
      pageId,
    }));
    dispatch(_removeElements(elementIds, pageId));

    if (shouldRefresh) {
      dispatch(fetchAllRenderables());
    }
  }
);

export const setFilter = createThunk(
  'setFilter',
  ({ dispatch }, filter, elementId, doRender = true) => {
    const _setFilter = createAction('setFilter');
    dispatch(_setFilter({ filter, elementId }));

    if (doRender === true) {
      dispatch(fetchAllRenderables());
    }
  }
);

export const setExpression = createThunk('setExpression', setExpressionFn);
function setExpressionFn({ dispatch, getState }, expression, elementId, pageId, doRender = true) {
  // dispatch action to update the element in state
  const _setExpression = createAction('setExpression');
  dispatch(_setExpression({ expression, elementId, pageId }));

  // read updated element from state and fetch renderable
  const updatedElement = getNodeById(getState(), elementId, pageId);

  // reset element.filter if element is no longer a filter
  // TODO: find a way to extract a list of filter renderers from the functions registry
  if (
    updatedElement.filter &&
    !['dropdownControl', 'timefilterControl', 'exactly'].some((filter) =>
      updatedElement.expression.includes(filter)
    )
  ) {
    const filter = '';
    dispatch(setFilter(filter, elementId, pageId, doRender));
    // setFilter will trigger a re-render so we can skip the fetch here
  } else if (doRender === true) {
    dispatch(fetchRenderable(updatedElement));
  }
}

const setAst = createThunk('setAst', ({ dispatch }, ast, element, pageId, doRender = true) => {
  try {
    const expression = toExpression(ast);
    dispatch(setExpression(expression, element.id, pageId, doRender));
  } catch (err) {
    const notifyService = pluginServices.getServices().notify;
    notifyService.error(err);

    // TODO: remove this, may have been added just to cause a re-render, but why?
    dispatch(setExpression(element.expression, element.id, pageId, doRender));
  }
});

// index here is the top-level argument in the expression. for example in the expression
// demodata().pointseries().plot(), demodata is 0, pointseries is 1, and plot is 2
export const setAstAtIndex = createThunk(
  'setAstAtIndex',
  ({ dispatch, getState }, index, ast, element, pageId) => {
    // invalidate cached context for elements after this index
    dispatch(flushContextAfterIndex({ elementId: element.id, index }));

    const newElement = set(element, `ast.chain.${index}`, ast);
    const newAst = get(newElement, 'ast');

    // fetch renderable using existing context, if available (value is null if not cached)
    const { index: contextIndex, context: contextValue } = getSiblingContext(
      getState(),
      element.id,
      index - 1
    );

    // if we have a cached context, update the expression, but use cache when updating the renderable
    if (contextValue) {
      // set the expression, but skip the fetchRenderable step
      dispatch(setAst(newAst, element, pageId, false));

      // use context when updating the expression, it will be passed to the intepreter
      const partialAst = {
        ...newAst,
        chain: newAst.chain.filter((exp, i) => {
          if (contextValue) {
            return i > contextIndex;
          }
          return i >= index;
        }),
      };
      return dispatch(fetchRenderableWithContext(newElement, partialAst, contextValue));
    }

    // if no cached context, update the ast like normal
    dispatch(setAst(newAst, element, pageId));
  }
);

/**
 * Updating the value of the given argument of the element's expression.
 * @param {string} args.path - the path to the argument at the AST. Example: "ast.chain.0.arguments.some_arg.chain.1.arguments".
 * @param {string} args.argName - the argument name at the AST.
 * @param {number} args.valueIndex - the index of the value in the array of argument's values.
 * @param {any} args.value - the value to be set to the AST.
 * @param {any} args.element - the element, which contains the expression.
 * @param {any} args.pageId - the workpad's page, where element is located.
 */
export const setArgument = createThunk('setArgument', ({ dispatch }, args) => {
  const { argName, value, valueIndex, element, pageId, path } = args;
  let selector = `${path}.${argName}`;
  if (valueIndex != null) {
    selector += '.' + valueIndex;
  }

  const newElement = set(element, selector, value);
  const pathTerms = path.split('.');
  const argumentChainPath = pathTerms.slice(0, 3);
  const argumnentChainIndex = last(argumentChainPath);
  const newAst = get(newElement, argumentChainPath);
  dispatch(setAstAtIndex(argumnentChainIndex, newAst, element, pageId));
});

/**
 * Adding the value to the given argument of the element's expression.
 * @param {string} args.path - the path to the argument at the AST. Example: "ast.chain.0.arguments.some_arg.chain.1.arguments".
 * @param {string} args.argName - the argument name at the given path of the AST.
 * @param {any} args.value - the value to be added to the array of argument's values at the AST.
 * @param {any} args.element - the element, which contains the expression.
 * @param {any} args.pageId - the workpad's page, where element is located.
 */
export const addArgumentValue = createThunk('addArgumentValue', ({ dispatch }, args) => {
  const { argName, value, element, path } = args;
  const values = get(element, [...path.split('.'), argName], []);
  const newValue = values.concat(value);
  dispatch(
    setArgument({
      ...args,
      value: newValue,
    })
  );
});

export const deleteArgumentAtIndex = createThunk('deleteArgumentAtIndex', ({ dispatch }, args) => {
  const { element, pageId, argName, argIndex, path } = args;
  const pathTerms = path.split('.');
  const argumentChainPath = pathTerms.slice(0, 3);
  const argumnentChainIndex = last(argumentChainPath);
  const curVal = get(element, [...pathTerms, argName]);
  let newElement =
    argIndex != null && curVal.length > 1
      ? // if more than one val, remove the specified val
        del(element, `${path}.${argName}.${argIndex}`)
      : // otherwise, remove the entire key
        del(element, argName ? `${path}.${argName}` : path);

  const parentPath = pathTerms.slice(0, pathTerms.length - 1);
  const updatedArgument = get(newElement, parentPath);

  if (Array.isArray(updatedArgument) && !updatedArgument.length) {
    newElement = del(element, parentPath);
  }

  dispatch(setAstAtIndex(argumnentChainIndex, get(newElement, argumentChainPath), element, pageId));
});

/*
  payload: element defaults. Eg {expression: 'foo'}
*/
export const addElement = createThunk('addElement', ({ dispatch }, pageId, element) => {
  const newElement = { ...getDefaultElement(), ...getBareElement(element, true) };
  if (element.width) {
    newElement.position.width = element.width;
  }
  if (element.height) {
    newElement.position.height = element.height;
  }
  const _addElement = createAction('addElement');
  dispatch(_addElement({ pageId, element: newElement }));

  // refresh all elements if there's a filter, otherwise just render the new element
  if (element.filter) {
    dispatch(fetchAllRenderables());
  } else {
    dispatch(fetchRenderable(newElement));
  }

  // select the new element
  dispatch(selectToplevelNodes([newElement.id]));
});
