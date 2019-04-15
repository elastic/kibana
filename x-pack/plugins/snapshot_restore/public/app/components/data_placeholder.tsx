/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface Props {
  data: any;
  children: any;
}

export const DataPlaceholder: React.SFC<Props> = ({ data, children }) => {
  if (data != null) {
    return children;
  }

  return <FormattedMessage id="xpack.snapshotRestore.dataPlaceholderLabel" defaultMessage="-" />;
};
