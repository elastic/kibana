/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { JsonView } from '../../../common/components/event_details/json_view';
import { useRightPanelContext } from '../context';

/**
 * Json view displayed in the document details expandable flyout right section
 */
export const JsonTab: FC = memo(() => {
  const { searchHit } = useRightPanelContext();

  return <JsonView rawEventData={searchHit} />;
});

JsonTab.displayName = 'JsonTab';
