/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { useDocumentDetailsContext } from '../../shared/context';
import { FlyoutJsonTab } from '../../../shared/components/flyout_json_tab';

/**
 * Json view displayed in the document details expandable flyout right section
 */
export const JsonTab = memo(() => {
  const { searchHit, isPreview } = useDocumentDetailsContext();
  return <FlyoutJsonTab searchHit={searchHit} isPreview={isPreview} />;
});

JsonTab.displayName = 'JsonTab';
