/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect } from 'react';

import { ComponentTemplateDeserialized } from './types';
import { useApi } from './component_templates_context';

interface Props {
  onComponents?(components: ComponentTemplateDeserialized[]): void;
  children: (arg: {
    isLoading: boolean;
    components: ComponentTemplateDeserialized[] | null | undefined;
  }) => JSX.Element;
}

export const ComponentTemplatesContainer = ({ onComponents, children }: Props) => {
  const { data, isLoading } = useApi().useComponentTemplates();

  useEffect(() => {
    if (onComponents !== undefined && Array.isArray(data)) {
      onComponents(data);
    }
  }, [data, onComponents]);

  return children({ isLoading, components: data });
};
