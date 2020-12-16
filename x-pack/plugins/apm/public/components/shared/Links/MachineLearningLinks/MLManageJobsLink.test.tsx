/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../utils/testHelpers';
import { MLManageJobsLink } from './MLManageJobsLink';

test('MLManageJobsLink', async () => {
  const href = await getRenderedHref(() => <MLManageJobsLink />, {
    search:
      '?rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0',
  } as Location);

  expect(href).toMatchInlineSnapshot(
    `"/app/ml/jobs?_a=(jobs:(queryText:'groups:(apm)'))&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-5h,to:now-2h))"`
  );
});
