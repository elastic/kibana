/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fromExpression } from '@kbn/interpreter';
import { useExpressionsService } from '../../services';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';
// @ts-expect-error
import { setExpression, flushContext } from '../../state/actions/elements';
// @ts-expect-error
import { ElementNotSelected } from './element_not_selected';
import { Expression as Component } from './expression';
import { State, CanvasElement } from '../../../types';

interface ExpressionProps {
  done: () => void;
}

interface ExpressionContainerProps extends ExpressionProps {
  element: CanvasElement;
  pageId: string;
}

export interface FormState {
  dirty: boolean;
  expression: string;
}

export const Expression: FC<ExpressionProps> = ({ done }) => {
  const { element, pageId } = useSelector((state: State) => ({
    pageId: getSelectedPage(state),
    element: getSelectedElement(state),
  }));

  if (!element) {
    return <ElementNotSelected done={done} />;
  }

  return <ExpressionContainer key={element.id} done={done} element={element} pageId={pageId} />;
};

const ExpressionContainer: FC<ExpressionContainerProps> = ({ done, element, pageId }) => {
  const expressions = useExpressionsService();
  const dispatch = useDispatch();
  const [isCompact, setCompact] = useState<boolean>(true);
  const toggleCompactView = useCallback(() => {
    setCompact(!isCompact);
  }, [isCompact, setCompact]);

  const dispatchSetExpression = useCallback(
    (expression: string) => {
      // destroy the context cache
      dispatch(flushContext(element.id));

      // update the element's expression
      dispatch(setExpression(expression, element.id, pageId));
    },
    [dispatch, element, pageId]
  );

  const [formState, setFormState] = useState<FormState>({
    dirty: false,
    expression: element.expression,
  });

  const updateValue = useCallback(
    (expression: string = '') => {
      setFormState({
        expression,
        dirty: true,
      });
    },
    [setFormState]
  );

  const onSetExpression = useCallback(
    (expression: string) => {
      setFormState({
        ...formState,
        dirty: false,
      });
      dispatchSetExpression(expression);
    },
    [setFormState, dispatchSetExpression, formState]
  );

  const currentExpression = formState.expression;

  const error = useMemo(() => {
    try {
      // TODO: We should merge the advanced UI input and this into a single validated expression input.
      fromExpression(currentExpression);
      return null;
    } catch (e) {
      return e.message;
    }
  }, [currentExpression]);

  useEffect(() => {
    if (element.expression !== formState.expression && !formState.dirty) {
      setFormState({
        dirty: false,
        expression: element.expression,
      });
    }
  }, [element, setFormState, formState]);

  const functionDefinitions = useMemo(
    () => Object.values(expressions.getFunctions()),
    [expressions]
  );

  return (
    <Component
      done={done}
      isCompact={isCompact}
      functionDefinitions={functionDefinitions}
      formState={formState}
      setExpression={onSetExpression}
      toggleCompactView={toggleCompactView}
      updateValue={updateValue}
      error={error}
    />
  );
};
