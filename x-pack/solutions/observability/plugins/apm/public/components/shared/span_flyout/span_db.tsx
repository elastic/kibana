/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { ReactElement } from 'react';
import React, { useMemo } from 'react';
import type { Span } from '../../../../typings/es_schemas/ui/span';

const DATABASE_STATEMENT_TITLE = i18n.translate(
  'xpack.apm.transactionDetails.spanFlyout.databaseStatementTitle',
  { defaultMessage: 'Database statement' }
);

/**
 * Resolves the database statement as a `Body.Section` for directly under `Body`, where it renders
 * above the tab panels and stays mounted on every tab.
 */
export function useSpanDatabaseSection(
  spanDb?: NonNullable<Span['span']>['db']
): ReactElement | null {
  const statement = spanDb?.statement || undefined;

  return useMemo(() => {
    if (!statement) {
      return null;
    }

    return (
      <FlyoutTemplate.Body.Section
        id="databaseStatement"
        title={DATABASE_STATEMENT_TITLE}
        data-test-subj="spanFlyoutDatabaseSection"
      >
        <EuiCodeBlock language="sql" fontSize="m" paddingSize="m" overflowHeight={150}>
          {statement}
        </EuiCodeBlock>
      </FlyoutTemplate.Body.Section>
    );
  }, [statement]);
}
