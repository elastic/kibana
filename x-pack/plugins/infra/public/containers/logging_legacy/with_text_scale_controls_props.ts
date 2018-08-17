/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { TextScale } from '../../../common/log_text_scale';
import { logTextviewActions, logTextviewSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withTextScale = connect(
  (state: State) => ({
    availableTextScales: ['large', 'medium', 'small'] as TextScale[],
    textScale: logTextviewSelectors.selectTextviewScale(state),
  }),
  bindPlainActionCreators({
    setTextScale: logTextviewActions.setTextviewScale,
  })
);

export const WithTextScale = asChildFunctionRenderer(withTextScale);
