/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DetailPanel } from './detail_panel';
import { IndexTable } from './index_table';

export function IndexList({
  match: {
    params: { filter },
  },
}) {
  return (
    <div className="im-snapshotTestSubject" data-test-subj="indicesList">
      <IndexTable filterFromURI={filter} />
      <DetailPanel />
    </div>
  );
}
