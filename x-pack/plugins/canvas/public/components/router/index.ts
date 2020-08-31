/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
// @ts-expect-error untyped local
import { setFullscreen } from '../../state/actions/transient';
import {
  enableAutoplay,
  setRefreshInterval,
  setAutoplayInterval,
} from '../../state/actions/workpad';
// @ts-expect-error untyped local
import { Router as Component } from './router';
import { State } from '../../../types';
export * from './context';

const mapDispatchToProps = {
  enableAutoplay,
  setAutoplayInterval,
  setFullscreen,
  setRefreshInterval,
};

const mapStateToProps = (state: State) => ({
  refreshInterval: state.transient.refresh.interval,
  autoplayInterval: state.transient.autoplay.interval,
  autoplay: state.transient.autoplay.enabled,
  fullscreen: state.transient.fullScreen,
});

export const Router = connect(
  mapStateToProps,
  mapDispatchToProps,
  (stateProps, dispatchProps, ownProps) => {
    return {
      ...ownProps,
      ...dispatchProps,
      setRefreshInterval: (interval: number) => {
        if (interval !== stateProps.refreshInterval) {
          dispatchProps.setRefreshInterval(interval);
        }
      },
      setAutoplayInterval: (interval: number) => {
        if (interval !== stateProps.autoplayInterval) {
          dispatchProps.setRefreshInterval(interval);
        }
      },
      enableAutoplay: (autoplay: boolean) => {
        if (autoplay !== stateProps.autoplay) {
          dispatchProps.enableAutoplay(autoplay);
        }
      },
      setFullscreen: (fullscreen: boolean) => {
        if (fullscreen !== stateProps.fullscreen) {
          dispatchProps.setFullscreen(fullscreen);
        }
      },
    };
  }
)(Component);
