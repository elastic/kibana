/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextTruncate } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import type { CasesService } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/types';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash/fp';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { EntityRiskInput } from '../../../../../common/entity_analytics/risk_engine/types';
import { useRiskInputActions } from './use_risk_input_actions';

export const useRiskInputActionsPanels = (inputs: EntityRiskInput[], closePopover: () => void) => {
  const { cases: casesService } = useKibana<{ cases?: CasesService }>().services;
  const { addToExistingCase, addToNewCaseClick, addToNewTimeline } = useRiskInputActions(
    inputs,
    closePopover
  );
  const userCasesPermissions = casesService?.helpers.canUseCases([SECURITY_SOLUTION_OWNER]);
  const hasCasesPermissions = userCasesPermissions?.create && userCasesPermissions?.read;

  return useMemo(() => {
    const timelinePanel = {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.actions.addToNewTimeline"
          defaultMessage="Add to new timeline"
        />
      ),

      onClick: addToNewTimeline,
    };
    const ruleName = get(['fields', ALERT_RULE_NAME], inputs[0]) ?? [''];
    const title = i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.riskInputs.actions.title',
      {
        defaultMessage: 'Risk input: {description}',
        values: {
          description:
            inputs.length === 1
              ? ruleName[0]
              : i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.riskInputs.actions.titleDescription',
                  {
                    defaultMessage: '{quantity} selected',
                    values: {
                      quantity: inputs.length,
                    },
                  }
                ),
        },
      }
    );

    return [
      {
        title: (
          <EuiTextTruncate
            width={230} // It prevents the title from taking too much space
            text={title}
          />
        ),
        id: 0,
        items: hasCasesPermissions
          ? [
              timelinePanel,
              {
                name: (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.riskInputs.actions.addToNewCase"
                    defaultMessage="Add to new case"
                  />
                ),

                onClick: addToNewCaseClick,
              },

              {
                name: (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.riskInputs.actions.addToExistingCase"
                    defaultMessage="Add to existing case"
                  />
                ),

                onClick: addToExistingCase,
              },
            ]
          : [timelinePanel],
      },
    ];
  }, [addToExistingCase, addToNewCaseClick, addToNewTimeline, inputs, hasCasesPermissions]);
};
