/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { get } from 'lodash';
import { setWorkpadCSS } from '../../../state/actions/workpad';
import { getWorkpad } from '../../../state/selectors/workpad';
import { DEFAULT_WORKPAD_CSS } from '../../../../common/lib/constants';
import { State } from '../../../../types';
import { WorkpadCSS as Component } from './workpad_css';

const mapStateToProps = (state: State) => {
  const workpad = getWorkpad(state);

  return {
    workpadCSS: get<string>(workpad, 'css', DEFAULT_WORKPAD_CSS),
  };
};

const mapDispatchToProps = {
  setWorkpadCSS,
};

export const WorkpadCSS = connect(mapStateToProps, mapDispatchToProps)(Component);
