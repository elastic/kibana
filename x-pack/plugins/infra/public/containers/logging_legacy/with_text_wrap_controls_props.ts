/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { State, textviewActions, textviewSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withTextWrap = connect(
  (state: State) => ({
    wrap: textviewSelectors.selectTextviewWrap(state),
  }),
  bindPlainActionCreators({
    setTextWrap: textviewActions.setTextviewWrap,
  })
);

export const WithTextWrap = asChildFunctionRenderer(withTextWrap);
