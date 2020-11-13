/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServiceNodes } from './';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../utils/test_helpers';
import { getServiceNodeMetadata } from '../services/get_service_node_metadata';
import { SERVICE_NODE_NAME_MISSING } from '../../../common/service_nodes';

describe('service node queries', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('fetches services nodes', async () => {
    mock = await inspectSearchParams((setup) =>
      getServiceNodes({ setup, serviceName: 'foo' })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches metadata for a service node', async () => {
    mock = await inspectSearchParams((setup) =>
      getServiceNodeMetadata({
        setup,
        serviceName: 'foo',
        serviceNodeName: 'bar',
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches metadata for unidentified service nodes', async () => {
    mock = await inspectSearchParams((setup) =>
      getServiceNodeMetadata({
        setup,
        serviceName: 'foo',
        serviceNodeName: SERVICE_NODE_NAME_MISSING,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
