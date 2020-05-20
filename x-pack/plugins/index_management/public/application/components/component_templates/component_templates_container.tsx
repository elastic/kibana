/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import { ComponentTemplateDeserialized } from './types';
import { useApi } from './component_templates_context';
import { ComponentTemplates } from './component_templates';

interface Props {
  onComponents?(components: ComponentTemplateDeserialized[]): void;
}

export const ComponentTemplatesContainer = React.memo(({ onComponents }: Props) => {
  const { data, isLoading } = useApi().useComponentTemplates();

  useEffect(() => {
    if (onComponents !== undefined && Array.isArray(data)) {
      onComponents(data);
    }
  }, [data, onComponents]);

  return <ComponentTemplates isLoading={isLoading} components={data ?? []} />;
});
