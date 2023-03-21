/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { JSON_TAB_ERROR_TEST_ID } from './test_ids';
import { ERROR_MESSAGE, ERROR_TITLE } from './translations';
import { JsonView } from '../../../common/components/event_details/json_view';
import { useRightPanelContext } from '../context';

/**
 * Json view displayed in the document details expandable flyout right section
 */
export const JsonTab: FC = memo(() => {
  const { searchHit } = useRightPanelContext();

  if (!searchHit) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE}</h2>}
        body={<p>{ERROR_MESSAGE}</p>}
        data-test-subj={JSON_TAB_ERROR_TEST_ID}
      />
    );
  }

  return <JsonView rawEventData={searchHit} />;
});

JsonTab.displayName = 'JsonTab';
