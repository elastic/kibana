/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { DataTypeComponent } from '@kbn/onechat-plugin/public/application/components/data_catalog/data_catalog';

/**
 * Icon component for workspace data type
 */
const WorkspaceIcon = () => <EuiIcon type="workspace" />;

/**
 * Custom data type descriptor for workspace data
 */
export class WorkspaceDataType implements DataTypeComponent {
  getDataType(): string {
    return 'workspace';
  }

  getDisplayName(): string {
    return 'Workspace';
  }

  getIcon(): React.ComponentType {
    return WorkspaceIcon;
  }

  getDescription(): string {
    return 'Workspace-specific data and context for work chat applications';
  }
}
