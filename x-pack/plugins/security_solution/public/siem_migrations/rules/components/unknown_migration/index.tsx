/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

const UnknownMigrationComponent = () => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      direction="column"
      wrap={true}
    >
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          title={<h2>{i18n.UNKNOWN_MIGRATION}</h2>}
          titleSize="s"
          body={i18n.UNKNOWN_MIGRATION_BODY}
          data-test-subj="noMigrationsAvailable"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const UnknownMigration = React.memo(UnknownMigrationComponent);
UnknownMigration.displayName = 'UnknownMigration';
