/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import React from 'react';
import { inputsModel } from '../../store';
import { EventsTableProps, OwnHostsTableProps } from './hosts';

interface OwnProps {
  id: string;
  loading: boolean;
  refetch: inputsModel.Refetch;
  setQuery: (params: { id: string; isLoading: boolean; refetch: inputsModel.Refetch }) => void;
}
type Props = (OwnProps & OwnHostsTableProps) | (OwnProps & EventsTableProps);
export const manageQuery = (
  WrappedComponent: React.ComponentType<EventsTableProps> | React.ComponentClass<OwnHostsTableProps>
) => {
  class ManageQuery extends React.PureComponent<Props> {
    public componentDidUpdate(prevProps: Props) {
      const { loading, id, refetch, setQuery } = this.props;
      if (prevProps.loading !== loading) {
        setQuery({ id, isLoading: loading, refetch });
      }
    }

    public render() {
      const otherProps = omit(['id', 'refetch', 'setQuery'], this.props);
      return <WrappedComponent {...otherProps} />;
    }
  }

  return ManageQuery;
};
