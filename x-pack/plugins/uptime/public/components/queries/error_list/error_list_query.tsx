/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ErrorListItem } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { ErrorList } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getErrorListQuery } from './get_error_list';

interface ErrorListQueryResult {
  errorList?: ErrorListItem[];
}

type Props = UptimeCommonProps & UptimeGraphQLQueryProps<ErrorListQueryResult>;

export const makeErrorListQuery = ({ data, loading }: Props) => {
  const errorList: ErrorListItem[] | undefined = data ? data.errorList : undefined;
  return <ErrorList loading={loading} errorList={errorList} />;
};

export const ErrorListQuery = withUptimeGraphQL<ErrorListQueryResult>(
  makeErrorListQuery,
  getErrorListQuery
);
