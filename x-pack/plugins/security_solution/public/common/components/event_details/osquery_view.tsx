/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '../../lib/kibana';

interface Props {
  rawEventData: object | undefined;
}

export const OsqueryView = React.memo<Props>(({ rawEventData }) => {
  const {
    services: { osquery },
  } = useKibana();

  // @ts-expect-error
  const { OsqueryResults } = osquery;

  return <OsqueryResults rawEventData={rawEventData} />;
});

OsqueryView.displayName = 'OsqueryView';
