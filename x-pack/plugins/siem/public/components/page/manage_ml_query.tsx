/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import React from 'react';

import { inputsModel } from '../../store';

interface OwnProps {
  id: string;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export function manageQuery<T>(WrappedComponent: React.ComponentClass<T> | React.ComponentType<T>) {
  class ManageMlQuery extends React.PureComponent<OwnProps & T> {
    public componentDidUpdate(prevProps: OwnProps) {
      const { loading, id, refetch } = this.props;
      if (prevProps.loading !== loading) {
        console.log('Yo I am here in the loading stuff with an id of:', id);
        // TODO: Conduct the query
        // setQuery({ id, loading, refetch });
      }
    }

    public render() {
      // TODO: Change out this otherProps
      const otherProps = omit(['id', 'refetch', 'setQuery'], this.props);
      return <WrappedComponent {...otherProps} />;
    }
  }

  return ManageMlQuery;
}
