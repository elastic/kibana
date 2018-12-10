/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
import { initializeWorkpad } from '../../../state/actions/workpad';
import { selectElement } from '../../../state/actions/transient';
import { canUserWrite, getAppReady } from '../../../state/selectors/app';
import { getWorkpad, isWriteable } from '../../../state/selectors/workpad';
import { LoadWorkpad } from './load_workpad';
import { WorkpadApp as Component } from './workpad_app';

const mapStateToProps = state => {
  const appReady = getAppReady(state);

  return {
    isWriteable: isWriteable(state) && canUserWrite(state),
    appReady: typeof appReady === 'object' ? appReady : { ready: appReady },
    workpad: getWorkpad(state),
  };
};

const mapDispatchToProps = dispatch => ({
  initializeWorkpad() {
    dispatch(initializeWorkpad());
  },
  deselectElement(ev) {
    ev && ev.stopPropagation();
    dispatch(selectElement(null));
  },
});

const branches = [branch(({ workpad }) => workpad == null, renderComponent(LoadWorkpad))];

export const WorkpadApp = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  ...branches
)(Component);
