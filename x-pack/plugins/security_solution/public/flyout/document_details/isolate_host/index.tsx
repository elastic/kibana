/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { PanelContent } from './content';
import { PanelHeader } from './header';

export const DocumentDetailsIsolateHostPanelKey: IsolateHostPanelProps['key'] =
  'document-details-isolate-host';

export interface IsolateHostPanelProps extends FlyoutPanelProps {
  key: 'document-details-isolate-host';
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
    isolateAction: 'isolateHost' | 'unisolateHost' | undefined;
  };
}

/**
 * Panel to be displayed right section in the document details expandable flyout when isolate host is clicked in the
 * take action button
 */
export const IsolateHostPanel: FC<Partial<IsolateHostPanelProps>> = () => {
  return (
    <>
      <PanelHeader />
      <PanelContent />
    </>
  );
};
