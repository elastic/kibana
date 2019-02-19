/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ComponentType } from 'react';

import { BehaviorSubject, Subscription } from 'rxjs';
import { Dictionary } from '../../common/types/common';

// Sets up a ObservableComponent which subscribes to given observable updates and
// and passes them on as prop values to the given WrappedComponent.
// This give us the benefit of abstracting away the need to set up subscribers and callbacks,
// and the passed down props can be used in pure/functional components without
// the need for their own state management.
export function injectObservablesAsProps(
  observables: Dictionary<BehaviorSubject<any>>,
  WrappedComponent: ComponentType
): ComponentType {
  const observableKeys = Object.keys(observables);

  class ObservableComponent extends Component<any, any> {
    public state = observableKeys.reduce((reducedState: Dictionary<any>, key: string) => {
      reducedState[key] = observables[key].value;
      return reducedState;
    }, {});

    public subscriptions = {} as Dictionary<Subscription>;

    public componentDidMount() {
      observableKeys.forEach(k => {
        this.subscriptions[k] = observables[k].subscribe(v => this.setState({ [k]: v }));
      });
    }

    public componentWillUnmount() {
      Object.keys(this.subscriptions).forEach((key: string) =>
        this.subscriptions[key].unsubscribe()
      );
    }

    public render() {
      return (
        <WrappedComponent {...this.props} {...this.state}>
          {this.props.children}
        </WrappedComponent>
      );
    }
  }

  return ObservableComponent as ComponentType;
}
