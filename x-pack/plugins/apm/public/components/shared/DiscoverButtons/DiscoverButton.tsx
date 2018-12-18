/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { getAPMIndexPattern } from '../../../services/rest/savedObjects';
import { KibanaLink } from '../../../utils/url';

interface Props {
  query: StringMap;
}

interface State {
  query: StringMap;
}

export async function setApmIndexPatternQuery(query: StringMap) {
  if (query._a && query._a.index) {
    return query;
  }

  const indexPattern = await getAPMIndexPattern();
  const id = indexPattern && indexPattern.id;

  if (!query._a) {
    query._a = {};
  }

  query._a.index = id;

  return query;
}

export class DiscoverButton extends React.Component<Props, State> {
  public state: State = { query: this.props.query };
  public async componentDidMount() {
    const query = await setApmIndexPatternQuery(this.state.query);
    this.setState({ query });
  }

  public render() {
    const { children, ...rest } = this.props;
    const { query } = this.state;

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
