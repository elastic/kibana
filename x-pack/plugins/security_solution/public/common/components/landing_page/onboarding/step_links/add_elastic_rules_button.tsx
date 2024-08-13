/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { CardId } from '../types';
import { useStepContext } from '../context/card_context';
import { AddIntegrationCallout } from './add_integration_callout';
import { ADD_ELASTIC_RULES, ADD_ELASTIC_RULES_CALLOUT_TITLE } from './translations';

const AddElasticRulesButtonComponent = () => {
  const { finishedCardIds, onStepLinkClicked } = useStepContext();
  const isIntegrationsStepComplete = finishedCardIds?.has(CardId.addIntegrations);

  const onClick = useCallback(() => {
    onStepLinkClicked({
      originStepId: CardId.enablePrebuiltRules,
      stepLinkId: SecurityPageName.rules,
    });
  }, [onStepLinkClicked]);
  return (
    <>
      {!isIntegrationsStepComplete && (
        <AddIntegrationCallout
          stepName={ADD_ELASTIC_RULES_CALLOUT_TITLE}
          cardId={CardId.enablePrebuiltRules}
        />
      )}
      <LinkButton
        id={SecurityPageName.rules}
        fill
        className="step-paragraph"
        disabled={!isIntegrationsStepComplete}
        onClick={onClick}
      >
        {ADD_ELASTIC_RULES}
      </LinkButton>
    </>
  );
};

export const AddElasticRulesButton = React.memo(AddElasticRulesButtonComponent);
