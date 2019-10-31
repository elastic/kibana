/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { EuiLink, EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { withEndPointsListData } from '../../common/with_endpoints_list_data';

const EndpointName = withRouter<RouteComponentProps & { path: string; name: string }>(function({
  history,
  path,
  name,
}) {
  return <EuiLink onClick={() => history.push(path)}>{name}</EuiLink>;
});

const columns = [
  {
    field: '_source.host.hostname',
    name: 'Name',
    render: (name: string, item: { _id: string }) => {
      return <EndpointName name={name} path={`/endpoints/view/${item._id}`} />;
    },
  },
  {
    field: '_source.host.ip',
    name: 'IP Address',
  },
  {
    field: '_source.host.os.full',
    name: 'Operating System',
  },
  {
    field: '_source.endpoint.domain',
    name: 'Domain',
  },
  {
    field: '_source.host.name',
    name: 'Host Name',
  },
];

export class ListView extends PureComponent<{ endpoints: object[] }> {
  render() {
    const { endpoints } = this.props;
    return (
      <>
        <EuiBasicTable items={endpoints} columns={columns} />

        <EuiSpacer size="xxl" style={{ height: '60em' }} />
        <code>
          <pre>{JSON.stringify(endpoints, null, 4)}</pre>
        </code>
      </>
    );
  }
}

export const ListView2Connected = withEndPointsListData(ListView);
