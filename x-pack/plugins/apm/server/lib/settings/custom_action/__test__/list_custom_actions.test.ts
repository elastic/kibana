/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { listCustomActions } from '../list_custom_actions';
import {
  inspectSearchParams,
  SearchParamsMock
} from '../../../../../../../legacy/plugins/apm/public/utils/testHelpers';
import { Setup } from '../../../helpers/setup_request';

describe('List Custom Actions', () => {
  let mock: SearchParamsMock;

  it('fetches custom actions', async () => {
    mock = await inspectSearchParams(setup =>
      listCustomActions({
        setup: (setup as unknown) as Setup
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
