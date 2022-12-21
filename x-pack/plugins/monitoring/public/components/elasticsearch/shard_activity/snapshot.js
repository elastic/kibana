/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const Snapshot = ({ isSnapshot, repo, snapshot }) => {
  return isSnapshot ? (
    <Fragment>
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.shardActivity.snapshotTitle"
        defaultMessage="Repo: {repo} / Snapshot: {snapshot}"
        values={{
          repo,
          snapshot,
        }}
      />
    </Fragment>
  ) : null;
};
