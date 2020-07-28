/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { get } from 'lodash';
import {
  sizeWorkpad as setSize,
  setName,
  setWorkpadCSS,
  updateWorkpadVariables,
} from '../../state/actions/workpad';

import { getWorkpad } from '../../state/selectors/workpad';
import { DEFAULT_WORKPAD_CSS } from '../../../common/lib/constants';
import { WorkpadConfig as Component } from './workpad_config';
import { State, CanvasVariable } from '../../../types';

const mapStateToProps = (state: State) => {
  const workpad = getWorkpad(state);

  return {
    name: get(workpad, 'name'),
    size: {
      width: get(workpad, 'width'),
      height: get(workpad, 'height'),
    },
    css: get(workpad, 'css', DEFAULT_WORKPAD_CSS),
    variables: get(workpad, 'variables', []),
  };
};

const mapDispatchToProps = {
  setSize,
  setName,
  setWorkpadCSS,
  setWorkpadVariables: (vars: CanvasVariable[]) => updateWorkpadVariables(vars),
};

export const WorkpadConfig = connect(mapStateToProps, mapDispatchToProps)(Component);
