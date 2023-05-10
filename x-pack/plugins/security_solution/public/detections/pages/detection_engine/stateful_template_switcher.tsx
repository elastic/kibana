/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TemplateSwitcher } from '../../components/templates/template_switcher';
import { useTemplates } from '../../components/templates/use_templates';

interface Props {}

export const StatefulTemplateSwitcher = (props: Props) => {
  const { templates, activeTemplate, saveTemplate, setActiveTemplate } = useTemplates();
  const listofTemplates = Object.values(templates ?? []).map((temp) => ({
    id: temp.id,
    label: temp.label,
  }));

  // something
  return (
    <TemplateSwitcher
      templates={listofTemplates}
      selectedTemplateId={activeTemplate}
      onTemplateSelect={setActiveTemplate}
      onAddTemplate={(id, name) => {
        saveTemplate({
          id,
          label: name,
        });
      }}
    />
  );
};

// const userPrefs = {
// alertsPage: {
// templates: {
// temp1: [1],
// temp2: [1],
// },

// columnTemp1: {},

// columnTemp2: {},
// },
// };
