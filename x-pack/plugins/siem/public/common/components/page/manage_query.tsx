/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Position } from '@elastic/charts';
import { omit } from 'lodash/fp';
import React from 'react';
import deepEqual from 'fast-deep-equal';

import { inputsModel } from '../../store';
import { SetQuery } from '../../../hosts/pages/navigation/types';

interface OwnProps {
  deleteQuery?: ({ id }: { id: string }) => void;
  headerChildren?: React.ReactNode;
  id: string;
  legendPosition?: Position;
  loading: boolean;
  refetch: inputsModel.Refetch;
  setQuery: SetQuery;
  inspect?: inputsModel.InspectQuery;
}

export function manageQuery<T>(WrappedComponent: React.ComponentClass<T> | React.ComponentType<T>) {
  class ManageQuery extends React.Component<OwnProps & T> {
    static displayName: string;
    public componentDidUpdate(prevProps: OwnProps) {
      const { loading, id, refetch, setQuery, inspect = null } = this.props;
      setQuery({ id, inspect, loading, refetch });
    }

    public shouldComponentUpdate({ refetch: nextRefetch, ...nextProps }: OwnProps) {
      const { refetch: prevRefetch, ...prevProps } = this.props;

      return !deepEqual(prevProps, nextProps);
    }

    public componentWillUnmount() {
      const { deleteQuery, id } = this.props;
      if (deleteQuery) {
        deleteQuery({ id });
      }
    }

    public render() {
      const otherProps = omit(['refetch', 'setQuery'], this.props);
      return <WrappedComponent {...(otherProps as T)} />;
    }
  }
  ManageQuery.displayName = `ManageQuery (${WrappedComponent?.displayName ?? 'Unknown'})`;
  return ManageQuery;
}
