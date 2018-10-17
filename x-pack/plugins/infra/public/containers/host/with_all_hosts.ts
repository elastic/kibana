/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { graphql } from 'react-apollo';
// import gql from 'graphql-tag';
// import { GetAllHosts } from '../../../common/graphql/types';

// type ChildProps = {
//   hosts: GetAllHosts.Query['hosts'];
// };

export const AllHosts = null;

export const withAllHosts: any = (wrappedComponent: any) => wrappedComponent;
// export const withAllHosts = graphql<
//   {},
//   GetAllHosts.Query,
//   GetAllHosts.Variables,
//   ChildProps
// >(AllHosts, {
//   props: ({ data, ownProps }) => {
//     return {
//       hosts: data && data.hosts ? data.hosts : [],
//       ...ownProps,
//     };
//   },
// });
