/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { bindPlainActionCreators } from '../../utils/typed_redux';
import { targetActions } from './state';

export const withJumpMenuProps = connect(
  () => ({}),
  bindPlainActionCreators({
    jumpToTime: targetActions.jumpToTime,
  })
);
