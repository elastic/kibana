/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { OsqueryIcon } from '../../../components/osquery_icon';
import { AddPackButton } from '../../../packs/add_pack_button';
import { LoadIntegrationAssetsButton } from './load_integration_assets';
import { PRE_BUILT_MSG, PRE_BUILT_TITLE } from './translations';

const PacksTableEmptyStateComponent = () => {
  const actions = useMemo(
    () => (
      <EuiFlexGroup>
        <EuiFlexItem>
          <LoadIntegrationAssetsButton fill={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <AddPackButton fill={false} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return (
    <EuiEmptyPrompt
      icon={<OsqueryIcon />}
      color="transparent"
      title={<h2>{PRE_BUILT_TITLE}</h2>}
      body={<p>{PRE_BUILT_MSG}</p>}
      actions={actions}
    />
  );
};

export const PacksTableEmptyState = React.memo(PacksTableEmptyStateComponent);
