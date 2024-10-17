/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { RelatedIntegrations } from '../../../../../../rule_creation/components/related_integrations';
import type { RelatedIntegrationArray } from '../../../../../../../../common/api/detection_engine';

export const relatedIntegrationsSchema = {
  relatedIntegrations: schema.relatedIntegrations,
} as FormSchema<{
  relatedIntegrations: RelatedIntegrationArray;
}>;

export function RelatedIntegrationsEdit(): JSX.Element {
  return <RelatedIntegrations path="relatedIntegrations" />;
}

export function relatedIntegrationsDeserializer(defaultValue: FormData) {
  /* Set initial form value with camelCase key "relatedIntegrations" key instead of "related_integrations" */
  return {
    relatedIntegrations: defaultValue,
  };
}

export function relatedIntegrationsSerializer(formData: FormData): {
  related_integrations: RelatedIntegrationArray;
} {
  const relatedIntegrations = (formData.relatedIntegrations ?? []) as RelatedIntegrationArray;
  return {
    related_integrations: relatedIntegrations.filter((ri) => !isEmpty(ri.package)),
  };
}
