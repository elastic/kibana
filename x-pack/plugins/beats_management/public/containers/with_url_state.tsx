/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse, stringify } from 'querystring';
import React from 'react';
import { withRouter } from 'react-router-dom';
import { FlatObject } from '../app';
import { RendererFunction } from '../utils/typed_react';

type StateCallback<T> = (previousState: T) => T;

export interface URLStateProps<URLState = object> {
  goTo: (path: string) => void;
  goBack: () => void;
  pathname: string;
  URLParams: FlatObject<any>;
  setUrlState: (
    newState: FlatObject<URLState> | StateCallback<URLState> | Promise<StateCallback<URLState>>
  ) => void;
  urlState: URLState;
}
interface ComponentProps<URLState extends object> {
  history: any;
  match: any;
  children: RendererFunction<URLStateProps<URLState>>;
}

export class WithURLStateComponent<URLState extends object> extends React.Component<
  ComponentProps<URLState>
> {
  public render() {
    const { history, match } = this.props;

    return this.props.children({
      goBack: history.goBack,
      pathname: history.location.pathname,
      URLParams: match.params,
      goTo: this.goTo,
      setUrlState: this.setURLState,
      urlState: this.URLState,
    });
  }

  private get URLState(): URLState {
    // slice because parse does not account for the initial ? in the search string
    return parse(this.props.history.location.search.slice(0, -1)) as URLState;
  }

  private setURLState = async (
    state: FlatObject<URLState> | StateCallback<URLState> | Promise<StateCallback<URLState>>
  ) => {
    let newState;
    const pastState = this.URLState;
    if (typeof state === 'function') {
      newState = await state(pastState);
    } else {
      newState = state;
    }
    const search: string = stringify({
      ...(pastState as any),
      ...(newState as any),
    });

    const newLocation = {
      ...this.props.history.location,
      search,
    };

    this.props.history.replace(newLocation);
  };

  private goTo = (path: string) => {
    this.props.history.push({
      pathname: path,
      search: this.props.history.location.search,
    });
  };
}
export const WithURLState = withRouter<any>(WithURLStateComponent);

export function withUrlState<OP>(UnwrappedComponent: React.ComponentType<OP>): React.SFC<any> {
  return (origProps: OP) => {
    return (
      <WithURLState>
        {(URLProps: URLStateProps) => <UnwrappedComponent {...URLProps} {...origProps} />}
      </WithURLState>
    );
  };
}
