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
    name: get<string>(workpad, 'name'),
    size: {
      width: get<number>(workpad, 'width'),
      height: get<number>(workpad, 'height'),
    },
    css: get<string>(workpad, 'css', DEFAULT_WORKPAD_CSS),
    variables: get<CanvasVariable[]>(workpad, 'variables', []),
  };
};

const mapDispatchToProps = {
  setSize,
  setName,
  setWorkpadCSS,
  setWorkpadVariables: (vars: CanvasVariable[]) => updateWorkpadVariables(vars),
};

export const WorkpadConfig = connect(mapStateToProps, mapDispatchToProps)(Component);
