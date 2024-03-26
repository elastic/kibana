/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm } from '@kbn/triggers-actions-ui-plugin/public';

const CasesConnectorFieldsComponent: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={[]}
      secretsFormSchema={[]}
    />
  );
};

CasesConnectorFieldsComponent.displayName = 'CasesConnectorFields';

export const CasesConnectorFields = memo(CasesConnectorFieldsComponent);

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { CasesConnectorFields as default };
