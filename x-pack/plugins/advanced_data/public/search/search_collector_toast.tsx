/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiProgress, EuiText, EuiButton } from '@elastic/eui';
import { Subscription, Observable } from 'rxjs';
import { AdvancedSearchCollector } from './advanced_search_collector';

interface State {
  max: number;
  value: number;
  searchCount: number;
  runningInBackground: boolean;
}

interface Props {
  searchCollector$: Observable<AdvancedSearchCollector>;
  cancel: () => void;
  sendToBackground?: () => void;
}

export class SearchCollectorToast extends React.Component<Props, State> {
  private subscription?: Subscription;

  constructor(props: Props) {
    super(props);
    this.state = {
      max: 1,
      value: 0,
      searchCount: 0,
      runningInBackground: false,
    };
  }

  componentDidMount() {
    this.subscription = this.props.searchCollector$.subscribe(
      (searchCollector: AdvancedSearchCollector) => {
        this.setState({
          max: searchCollector.total,
          value: searchCollector.loaded,
          searchCount: Object.values(searchCollector.searches).length,
        });
      }
    );
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  sendToBackground = () => {
    this.setState({ runningInBackground: true });
    this.props.sendToBackground();
  };

  render() {
    return (
      <React.Fragment>
        <EuiText>Total searches: {this.state.searchCount}</EuiText>
        <EuiProgress max={this.state.max} value={this.state.value} />
        <EuiText>Searching...</EuiText>
        <EuiButton onClick={this.props.cancel}>Cancel</EuiButton>
        {this.props.sendToBackground && !this.state.runningInBackground ? (
          <EuiButton onClick={this.sendToBackground}>Send to background</EuiButton>
        ) : (
          undefined
        )}
        {this.props.sendToBackground && this.state.runningInBackground ? (
          <EuiText>
            Your searches are now running in the background! (view progress here link?)
          </EuiText>
        ) : (
          undefined
        )}
      </React.Fragment>
    );
  }
}
