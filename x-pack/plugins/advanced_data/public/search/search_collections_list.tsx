/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { Subscription } from 'rxjs';
import { BackgroundSearchCollection } from './bg_search_collection';

interface State {
  backgroundSearches: BackgroundSearchCollection[];
}

interface Props {
  backgroundSearches: BackgroundSearchCollection[];
}

export class SearchCollectionsList extends React.Component<Props, State> {
  private subscription?: Subscription;

  constructor(props: Props) {
    super(props);
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  renderBackgroundQueryLink(searchCollection: BackgroundSearchCollection) {
    return <EuiLink href={searchCollection.url}>{searchCollection.name}</EuiLink>;
  }

  render() {
    return (
      <React.Fragment>
        <EuiText>Background queries</EuiText>
        {this.props.backgroundSearches.forEach(bgSearch =>
          this.renderBackgroundQueryLink(bgSearch)
        )}
      </React.Fragment>
    );
  }
}
