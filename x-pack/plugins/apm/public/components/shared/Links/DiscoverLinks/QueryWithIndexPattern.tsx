/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import {
  getAPMIndexPattern,
  ISavedObject
} from 'x-pack/plugins/apm/public/services/rest/savedObjects';
import { RisonAPMQueryParams } from '../rison_helpers';

export function getQueryWithIndexPattern(
  query: RisonAPMQueryParams,
  indexPattern?: ISavedObject
) {
  if ((query._a && query._a.index) || !indexPattern) {
    return query;
  }

  const id = indexPattern && indexPattern.id;
  return {
    ...query,
    _a: {
      ...query._a,
      index: id
    }
  };
}

interface Props {
  query: RisonAPMQueryParams;
  children: (query: RisonAPMQueryParams) => ReactElement<unknown>;
}

interface State {
  indexPattern?: ISavedObject;
}

export class QueryWithIndexPattern extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    getAPMIndexPattern().then(indexPattern => {
      this.setState({ indexPattern });
    });
    this.state = {};
  }
  public render() {
    const { children, query } = this.props;
    const { indexPattern } = this.state;
    const renderWithQuery = children;
    return renderWithQuery(getQueryWithIndexPattern(query, indexPattern));
  }
}
