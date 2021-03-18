/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const txtStartFromTemplate = i18n.translate(
  'xpack.uiActionsEnhanced.components.DrilldownTemplateTable.accordion.title',
  {
    defaultMessage: 'Start from template',
    description: 'Title of the accordion which opens drilldown template table.',
  }
);

export const StartFromTemplate: React.FC = ({ children }) => {
  return (
    <EuiAccordion id="drilldown_manager_pick_existing_table" buttonContent={txtStartFromTemplate}>
      <EuiSpacer size={'s'} />
      {children}
    </EuiAccordion>
  );
};
