/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { i18n } from '@kbn/i18n';
// import React from 'react';
// import { Query, withApollo } from 'react-apollo';
// import { Snapshot as SnapshotType } from '../../../../common/graphql/types';
// import { UptimeCommonProps, UptimeCommonState } from '../../../uptime_app';
// import { Snapshot, SnapshotLoading } from '../../functional';
// import { getSnapshotQuery } from './get_snapshot';

// interface SnapshotQueryProps {
//   filters?: string;
//   registerWatch: (manager: () => void) => void;
// }

// interface SnapshotQueryState {
//   windowWidth: number;
// }

// type Props = SnapshotQueryProps & UptimeCommonProps;
// type State = SnapshotQueryState & UptimeCommonState;

// // export class SnapshotQuery extends React.Component<Props, State> {
// //   constructor(props: Props) {
// //     super(props);
// //     this.state = {
// //       windowWidth: window.innerWidth,
// //     };
// //   }

// //   public componentDidMount() {
// //     window.addEventListener('resize', this.updateWindowSize);
// //   }

// //   public componentWillUnmount() {
// //     window.removeEventListener('resize', this.updateWindowSize);
// //   }

// //   public render() {
// //     const {
// //       autorefreshIsPaused,
// //       autorefreshInterval,
// //       colors: { success, danger },
// //       dateRangeStart,
// //       dateRangeEnd,
// //       filters,
// //       lastForceRefresh,
// //     } = this.props;

// //     return (
// //       <Query
// //         pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
// //         query={getSnapshotQuery}
// //         variables={{ dateRangeStart, dateRangeEnd, filters }}
// //       >
// //         {({ loading, error, data, refetch }) => {
// //           if (loading) {
// //             return <SnapshotLoading />;
// //           }
// //           if (error) {
// //             return i18n.translate('xpack.uptime.snapshot.errorMessage', {
// //               values: { message: error.message },
// //               defaultMessage: 'Error {message}',
// //             });
// //           }
// //           if (lastForceRefresh && Date.now() > lastForceRefresh) {
// //             console.log('hi from the thing that should only trigger once')
// //             refetch({ dateRangeStart, dateRangeEnd, filters });
// //           }
// //           const { snapshot }: { snapshot: SnapshotType } = data;

// //           return (
// //             <Snapshot
// //               dangerColor={danger}
// //               successColor={success}
// //               snapshot={snapshot}
// //               windowWidth={this.state.windowWidth}
// //             />
// //           );
// //         }}
// //       </Query>
// //     );
// //   }

// //   private updateWindowSize = () => {
// //     this.setState({ windowWidth: window.innerWidth });
// //   };
// // }

// // export class SnapshotQuery extends React.Component<Props, State> {
// //   constructor(props: Props) {
// //     super(props);
// //     this.state = {
// //       windowWidth: window.innerWidth,
// //     };
// //     props.registerWatch(this.updateState);
// //   }

// //   public componentDidMount() {
// //     window.addEventListener('resize', this.updateWindowSize);
// //   }

// //   public componentWillUnmount() {
// //     window.removeEventListener('resize', this.updateWindowSize);
// //   }

// //   public render() {
// //     const {
// //       autorefreshIsPaused,
// //       autorefreshInterval,
// //       colors: { success, danger },
// //       dateRangeStart,
// //       dateRangeEnd,
// //       filters,
// //       // lastForceRefresh,
// //     } = this.props;

// //     return (
// //       <Query
// //         pollInterval={autorefreshIsPaused ? 0 : autorefreshInterval}
// //         notifyOnNetworkStatusChange
// //         query={getSnapshotQuery}
// //         variables={{ dateRangeStart, dateRangeEnd, filters }}
// //       >
// //         {({ updateQuery, loading, error, data, refetch, networkStatus, client }) => {
// //           console.log(`network status: ${networkStatus}`);
// //           // console.log(client);
// //           // const name =
// //           //   client && client.queryManager && client.queryManager.scheduler
// //           //     ? client.queryManager.scheduler.inFlightQueries
// //           //     : undefined;
// //           // console.log(name)
// //           // console.log(client.queryManager.queries.get(client.queryManager.queryIdsByName['Snapshot'][0]).observableQuery.isCurrentlyPolling)

// //           if (loading || networkStatus === 4) {
// //             return <SnapshotLoading />;
// //           }
// //           if (error) {
// //             return i18n.translate('xpack.uptime.snapshot.errorMessage', {
// //               values: { message: error.message },
// //               defaultMessage: 'Error {message}',
// //             });
// //           }
// //           if (this.state.lastForceRefresh) {
// //             // console.log(`network status when clicked: ${networkStatus}`);
// //             refetch({ dateRangeStart, dateRangeEnd, filters }).then(result =>
// //               this.setState({ lastForceRefresh: 1234567 })
// //             );
// //           }
// //           const { snapshot }: { snapshot: SnapshotType } = data;

// //           return (
// //             <Snapshot
// //               dangerColor={danger}
// //               successColor={success}
// //               snapshot={snapshot}
// //               windowWidth={this.state.windowWidth}
// //             />
// //           );
// //         }}
// //       </Query>
// //     );
// //   }

// //   private updateWindowSize = () => {
// //     this.setState({ windowWidth: window.innerWidth });
// //   };
// //   private updateState = () => {
// //     console.log(`I'm updating the state NOW`);
// //     this.setState({ lastForceRefresh: Date.now() });
// //   };
// // }

// class Query extends React.Component<Props, State> {
//   constructor(props: Props) {
//     super(props);
//     this.state = {
//       windowWidth: window.innerWidth,
//     };
//     props.registerWatch(this.updateState);
//     this.fetch(props);
//   }

//   public componentDidMount() {
//     window.addEventListener('resize', this.updateWindowSize);
//   }

//   public componentWillUnmount() {
//     window.removeEventListener('resize', this.updateWindowSize);
//   }

//   public render() {
//     const {
//       autorefreshIsPaused,
//       autorefreshInterval,
//       colors: { success, danger },
//       dateRangeStart,
//       dateRangeEnd,
//       filters,
//       client,
//       // lastForceRefresh,
//     } = this.props;
//     console.log('hi this is my client:');
//     console.log(client);
//     console.log(this.props);
//     return (
//       <div>Sup!</div>
//       // <Query
//       //   pollInterval={autorefreshIsPaused ? 0 : autorefreshInterval}
//       //   notifyOnNetworkStatusChange
//       //   query={getSnapshotQuery}
//       //   variables={{ dateRangeStart, dateRangeEnd, filters }}
//       // >
//       //   {({ updateQuery, loading, error, data, refetch, networkStatus, client }) => {
//       //     console.log(`network status: ${networkStatus}`);
//       //     // console.log(client);
//       //     // const name =
//       //     //   client && client.queryManager && client.queryManager.scheduler
//       //     //     ? client.queryManager.scheduler.inFlightQueries
//       //     //     : undefined;
//       //     // console.log(name)
//       //     // console.log(client.queryManager.queries.get(client.queryManager.queryIdsByName['Snapshot'][0]).observableQuery.isCurrentlyPolling)

//       //     if (loading || networkStatus === 4) {
//       //       return <SnapshotLoading />;
//       //     }
//       //     if (error) {
//       //       return i18n.translate('xpack.uptime.snapshot.errorMessage', {
//       //         values: { message: error.message },
//       //         defaultMessage: 'Error {message}',
//       //       });
//       //     }
//       //     if (this.state.lastForceRefresh) {
//       //       // console.log(`network status when clicked: ${networkStatus}`);
//       //       refetch({ dateRangeStart, dateRangeEnd, filters }).then(result =>
//       //         this.setState({ lastForceRefresh: 1234567 })
//       //       );
//       //     }
//       //     const { snapshot }: { snapshot: SnapshotType } = data;

//       //     return (
//       //       <Snapshot
//       //         dangerColor={danger}
//       //         successColor={success}
//       //         snapshot={snapshot}
//       //         windowWidth={this.state.windowWidth}
//       //       />
//       //     );
//       //   }}
//       // </Query>
//     );
//   }

//   private updateWindowSize = () => {
//     this.setState({ windowWidth: window.innerWidth });
//   };
//   private updateState = () => {
//     console.log(`I'm updating the state NOW`);
//     this.fetch(this.props);
//   };
//   private fetch = async (props: any) => {
//     const { client, dateRangeStart, dateRangeEnd, filters } = props;
//     const result = await client.query({
//       query: getSnapshotQuery,
//       variables: { dateRangeStart, dateRangeEnd, filters },
//     });
//     console.log(result);
//   };
// }

// export const SnapshotQuery = withApollo(Query);
