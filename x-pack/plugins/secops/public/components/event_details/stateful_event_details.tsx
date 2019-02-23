/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { DetailItem } from '../../graphql/types';

import { EventDetails, View } from './event_details';

interface Props {
  data: DetailItem[];
  id: string;
}

interface State {
  view: View;
}

export class StatefulEventDetails extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { view: 'table-view' };
  }

  public onViewSelected = (view: View): void => {
    this.setState({ view });
  };

  public render() {
    const { data, id } = this.props;

    return (
      <EventDetails
        data={data}
        id={id}
        view={this.state.view}
        onViewSelected={this.onViewSelected}
      />
    );
  }
}
