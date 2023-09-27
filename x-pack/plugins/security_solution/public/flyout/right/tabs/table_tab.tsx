/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { FieldsGrid } from '../components/fields_grid';
import { useRightPanelContext } from '../context';
import { TABLE_TAB_CONTENT_TEST_ID } from './test_ids';

/**
 * Table view displayed in the document details expandable flyout right section
 */
export const TableTab: FC = memo(() => {
  const { browserFields, dataFormattedForFieldBrowser, eventId } = useRightPanelContext();

  return (
    <FieldsGrid
      browserFields={browserFields}
      data={dataFormattedForFieldBrowser}
      eventId={eventId}
      scopeId={'alert-details-flyout'}
      data-test-subj={TABLE_TAB_CONTENT_TEST_ID}
    />
  );
});

TableTab.displayName = 'TableTab';
