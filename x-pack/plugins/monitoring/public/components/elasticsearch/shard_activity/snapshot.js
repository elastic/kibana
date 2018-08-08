/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

export const Snapshot = ({ isSnapshot, repo, snapshot }) => {
  return isSnapshot ? (
    <Fragment>
      Repo: {repo} / Snapshot: {snapshot}
    </Fragment>
  ) : null;
};
