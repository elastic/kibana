/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_CASE_SUCCESS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.attackDiscoveryPanel.actions.useAddToCase.addToCaseSuccessLabel',
  {
    defaultMessage: 'Successfully added attack discovery to the case',
  }
);

export const ADD_TO_NEW_CASE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.attackDiscoveryPanel.actions.useAddToCase.addToNewCaseButtonLabel',
  {
    defaultMessage: 'Add to new case',
  }
);

export const CREATE_A_CASE_FOR_ATTACK_DISCOVERY = (title: string) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.attackDiscoveryPanel.actions.useAddToCase.createACaseForAttackDiscoveryHeaderText',
    {
      values: { title },
      defaultMessage: 'Create a case for attack discovery {title}',
    }
  );
