/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../actions', () => ({}));

import { resetDataRequest } from './map';
import _ from 'lodash';

describe('reducers/map', () => {
  it('Should clear datarequest without mutation store state', async () => {
    const layerId = 'foobar';
    const requestToken = 'tokenId';
    const dataId = 'dataId';

    const preState = {
      layerList: [
        {
          id: `not_${layerId}`,
        },
        {
          id: layerId,
          __dataRequests: [
            {
              dataRequestToken: `not_${requestToken}`,
              dataId: `not_${dataId}`,
            },
            {
              dataRequestToken: requestToken,
              dataId: dataId,
            },
          ],
        },
      ],
    };

    const preStateCopy = _.cloneDeep(preState);

    const action = {
      layerId,
      requestToken,
      dataId,
    };

    const postState = resetDataRequest(preState, action);

    //Ensure previous state is not mutated.
    expect(_.isEqual(preState, preStateCopy)).toEqual(true);

    //Ensure new state is set correctly.
    expect(postState.layerList[1].__dataRequests[1].dataId).toEqual(dataId);
    expect(postState.layerList[1].__dataRequests[1].dataRequestToken).toEqual(null);
  });
});
