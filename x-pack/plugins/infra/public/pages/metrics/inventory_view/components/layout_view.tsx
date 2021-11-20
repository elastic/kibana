/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SnapshotNode } from '../../../../../common/http_api';
import { useSavedViewContext } from '../../../../containers/saved_view/saved_view';
import { Layout } from './layout';

interface Props {
  reload: () => Promise<any>;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
}

export const LayoutView = (props: Props) => {
  const { shouldLoadDefault, currentView } = useSavedViewContext();
  return <Layout shouldLoadDefault={shouldLoadDefault} currentView={currentView} {...props} />;
};
