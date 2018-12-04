/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import {
  getAPMIndexPattern,
  ISavedObject
} from '../../../services/rest/savedObjects';
import { KibanaLink } from '../../../utils/url';

interface Props {
  query: StringMap;
}

interface State {
  indexPattern?: ISavedObject;
}

export class DiscoverButton extends React.Component<Props, State> {
  public state = {};
  public async componentDidMount() {
    const indexPattern = await getAPMIndexPattern();
    this.setState({ indexPattern });
  }

  public render() {
    const { query, children, ...rest } = this.props;
    const id: string = get(this.state, 'indexPattern.id');

    if (!query._a.index) {
      query._a.index = id;
    }

    return (
      <KibanaLink
        pathname={'/app/kibana'}
        hash={'/discover'}
        query={query}
        children={children}
        {...rest}
      />
    );
  }
}
