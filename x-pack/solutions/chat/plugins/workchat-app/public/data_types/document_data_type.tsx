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
 * Icon component for document data type
 */
const DocumentIcon = () => <EuiIcon type="document" />;

/**
 * Custom data type descriptor for document data
 */
export class DocumentDataType implements DataTypeComponent {
  getDataType(): string {
    return 'document';
  }

  getDisplayName(): string {
    return 'Document';
  }

  getIcon(): React.ComponentType {
    return DocumentIcon;
  }

  getDescription(): string {
    return 'Document content and metadata for knowledge management';
  }
}
