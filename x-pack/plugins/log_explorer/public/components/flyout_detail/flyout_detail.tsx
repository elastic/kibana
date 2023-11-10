/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FlyoutProps, LogDocument } from './types';
import { useDocDetail } from './use_doc_detail';
import { FlyoutHeader } from './flyout_header';
import { FlyoutHighlights } from './flyout_highlights';

export function FlyoutDetail({
  dataView,
  doc,
  actions,
}: Pick<FlyoutProps, 'dataView' | 'doc' | 'actions'>) {
  const parsedDoc = useDocDetail(doc as LogDocument, { dataView });

  return (
    <>
      <FlyoutHeader doc={parsedDoc} />
      <FlyoutHighlights formattedDoc={parsedDoc} flattenedDoc={doc.flattened} actions={actions} />
    </>
  );
}
