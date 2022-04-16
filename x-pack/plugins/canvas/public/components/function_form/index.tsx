/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Ast } from '@kbn/interpreter';
import deepEqual from 'react-fast-compare';
import { ExpressionAstExpression, ExpressionValue } from '@kbn/expressions-plugin';
import { findExpressionType } from '../../lib/find_expression_type';
import { getId } from '../../lib/get_id';
// @ts-expect-error unconverted action function
import { createAsset } from '../../state/actions/assets';
import {
  fetchContext,
  setArgument as setArgumentValue,
  addArgumentValue,
  deleteArgumentAtIndex,
  // @ts-expect-error untyped local
} from '../../state/actions/elements';
import {
  getSelectedElement,
  getSelectedPage,
  getContextForIndex,
  getGlobalFilterGroups,
} from '../../state/selectors/workpad';
import { getAssets } from '../../state/selectors/assets';
// @ts-expect-error unconverted lib
import { findExistingAsset } from '../../lib/find_existing_asset';
import { FunctionForm as Component } from './function_form';
import { Args, ArgType, ArgTypeDef } from '../../expression_types/types';
import { State, ExpressionContext, CanvasElement, AssetType } from '../../../types';

interface FunctionFormProps {
  name: string;
  argResolver: (ast: ExpressionAstExpression) => Promise<ExpressionValue>;
  args: Args;
  nestedFunctionsArgs: Args;
  argType: ArgType;
  argTypeDef: ArgTypeDef;
  expressionIndex: number;
  nextArgType?: ArgType;
  path: string;
  parentPath: string;
  removable?: boolean;
}

export const FunctionForm: React.FunctionComponent<FunctionFormProps> = (props) => {
  const { expressionIndex, ...restProps } = props;
  const { nextArgType, path, parentPath, argType } = restProps;
  const dispatch = useDispatch();
  const context = useSelector<State, ExpressionContext>(
    (state) => getContextForIndex(state, parentPath, expressionIndex),
    deepEqual
  );
  const element = useSelector<State, CanvasElement | undefined>(
    (state) => getSelectedElement(state),
    deepEqual
  );
  const pageId = useSelector<State, string>((state) => getSelectedPage(state), shallowEqual);
  const assets = useSelector<State, State['assets']>((state) => getAssets(state), shallowEqual);
  const filterGroups = useSelector<State, string[]>(
    (state) => getGlobalFilterGroups(state),
    shallowEqual
  );

  const addArgument = useCallback(
    (argName: string, argValue: string | Ast | null) => () => {
      dispatch(addArgumentValue({ element, pageId, argName, value: argValue, path }));
    },
    [dispatch, element, pageId, path]
  );

  const updateContext = useCallback(() => {
    return dispatch(fetchContext(expressionIndex, element, false, parentPath));
  }, [dispatch, element, expressionIndex, parentPath]);

  const setArgument = useCallback(
    (argName: string, valueIndex: number) => (value: string | Ast | null) => {
      dispatch(setArgumentValue({ element, pageId, argName, value, valueIndex, path }));
    },
    [dispatch, element, pageId, path]
  );

  const deleteArgument = useCallback(
    (argName: string, argIndex: number) => () => {
      dispatch(deleteArgumentAtIndex({ element, pageId, argName, argIndex, path }));
    },
    [dispatch, element, pageId, path]
  );

  const deleteParentArgument = useCallback(() => {
    dispatch(deleteArgumentAtIndex({ element, pageId, path: parentPath }));
  }, [dispatch, element, pageId, parentPath]);

  const onAssetAddDispatch = useCallback(
    (type: AssetType['type'], content: AssetType['value']) => {
      // make the ID here and pass it into the action
      const assetId = getId('asset');
      dispatch(createAsset(type, content, assetId));

      // then return the id, so the caller knows the id that will be created
      return assetId;
    },
    [dispatch]
  );

  const onAssetAdd = useCallback(
    (type: AssetType['type'], content: AssetType['value']) => {
      const existingId = findExistingAsset(type, content, assets);
      if (existingId) {
        return existingId;
      }
      return onAssetAddDispatch(type, content);
    },
    [assets, onAssetAddDispatch]
  );

  return (
    <Component
      {...restProps}
      id={path}
      context={context}
      filterGroups={filterGroups}
      expressionType={findExpressionType(argType)}
      nextExpressionType={nextArgType ? findExpressionType(nextArgType) : undefined}
      onValueAdd={addArgument}
      updateContext={updateContext}
      onValueChange={setArgument}
      onValueRemove={deleteArgument}
      onContainerRemove={deleteParentArgument}
      onAssetAdd={onAssetAdd}
    />
  );
};
