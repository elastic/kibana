/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { isTimeKey, TimeKey } from '../../../common/time';
import {
  mapRisonAppLocationToState,
  mapStateToRisonAppLocation,
  withStateFromLocation,
} from '../../containers/with_state_from_location';

interface TextStreamScrollState {
  target: TimeKey;
}

const withTargetStateFromLocation = withStateFromLocation<TextStreamScrollState>({
  mapLocationToState: mapRisonAppLocationToState(locationState => ({
    target: isTimeKey(locationState.target)
      ? {
          tiebreaker: locationState.target.tiebreaker,
          time: locationState.target.time,
        }
      : {
          tiebreaker: 0,
          time: Date.now(),
        },
  })),
  mapStateToLocation: mapStateToRisonAppLocation(state => ({
    target: {
      tiebreaker: state.target.tiebreaker,
      time: state.target.time,
    },
  })),
});

interface InjectedTextStreamScrollStateProps extends TextStreamScrollState {
  jumpToTarget: (target: TimeKey) => any;
  reportVisibleInterval: (
    params: {
      pagesBeforeStart: number;
      pagesAfterEnd: number;
      startKey: TimeKey | null;
      middleKey: TimeKey | null;
      endKey: TimeKey | null;
    }
  ) => any;
}

interface TextStreamScrollStateProps extends InjectedTextStreamScrollStateProps {
  pushStateInLocation: (state: TextStreamScrollState) => void;
  replaceStateInLocation: (state: TextStreamScrollState) => void;
}

export const withTextStreamScrollState = <
  WrappedComponentProps extends InjectedTextStreamScrollStateProps
>(
  WrappedComponent: React.ComponentType<WrappedComponentProps>
) => {
  const wrappedName = WrappedComponent.displayName || WrappedComponent.name;

  return withTargetStateFromLocation(
    class WithTextStreamScrollState extends React.PureComponent<
      TextStreamScrollStateProps & WrappedComponentProps
    > {
      public static displayName = `WithStateFromLocation(${wrappedName})`;

      public componentDidMount() {
        this.jumpToTarget(this.props.target);
      }

      // public componentDidUpdate(prevProps: TextStreamScrollStateProps) {
      //   if (this.props.target !== prevProps.target) {
      //     this.jumpToTarget(this.props.target);
      //   }
      // }

      public render() {
        const { pushStateInLocation, replaceStateInLocation, ...otherProps } = this
          .props as TextStreamScrollStateProps;

        return (
          <WrappedComponent {...otherProps} reportVisibleInterval={this.reportVisibleInterval} />
        );
      }

      private jumpToTarget = (target: TimeKey) => {
        this.props.jumpToTarget(target);
      };

      private reportVisibleInterval = (params: {
        pagesBeforeStart: number;
        pagesAfterEnd: number;
        startKey: TimeKey | null;
        middleKey: TimeKey | null;
        endKey: TimeKey | null;
      }) => {
        if (params.middleKey) {
          this.props.replaceStateInLocation({
            target: params.middleKey,
          });
        }
        return this.props.reportVisibleInterval(params);
      };
    }
  );
};
