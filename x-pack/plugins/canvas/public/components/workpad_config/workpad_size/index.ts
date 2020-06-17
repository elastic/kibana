/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { get } from 'lodash';
import { sizeWorkpad as setSize } from '../../../state/actions/workpad';
import { getWorkpad } from '../../../state/selectors/workpad';
import { WorkpadSize as Component } from './workpad_size';
import { State } from '../../../../types';

const mapStateToProps = (state: State) => {
  const workpad = getWorkpad(state);

  return {
    size: {
      width: get<number>(workpad, 'width'),
      height: get<number>(workpad, 'height'),
    },
  };
};

const mapDispatchToProps = {
  setSize,
};

export const WorkpadSize = connect(mapStateToProps, mapDispatchToProps)(Component);
