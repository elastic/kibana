/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  DEFAULT_ITEMS_INDEX,
  DEFAULT_LISTS_INDEX,
  DEFAULT_SIGNALS_INDEX,
  SECURITY_FEATURE_ID,
} from '../../../../../common/constants';
import { CommaSeparatedValues } from './comma_separated_values';
import { MissingPrivileges } from './use_missing_privileges';
import {
  DetectionsRequirementsLink,
  SecuritySolutionRequirementsLink,
} from '../../../../common/components/links_to_docs';

export const MISSING_PRIVILEGES_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageTitle',
  {
    defaultMessage: 'Insufficient privileges',
  }
);

const CANNOT_EDIT_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.cannotEditRules',
  {
    defaultMessage: 'Without that privilege you cannot create or edit detection engine rules.',
  }
);

const CANNOT_EDIT_LISTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.cannotEditLists',
  {
    defaultMessage: 'Without these privileges, you cannot create or edit value lists.',
  }
);

const CANNOT_EDIT_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.cannotEditAlerts',
  {
    defaultMessage: 'Without these privileges, you cannot view or change status of alerts.',
  }
);

export const missingPrivilegesCallOutBody = ({
  indexPrivileges,
  featurePrivileges = [],
}: MissingPrivileges) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.messageDetail"
    defaultMessage="{essence} {indexPrivileges} {featurePrivileges} Related documentation: {docs}"
    values={{
      essence: (
        <p>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.essenceDescription"
            defaultMessage="You need the following privileges to fully access this functionality. Contact your administrator for further assistance."
          />
        </p>
      ),
      indexPrivileges:
        indexPrivileges.length > 0 ? (
          <>
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.indexPrivilegesTitle"
              defaultMessage="Missing Elasticsearch index privileges:"
            />
            <ul>
              {indexPrivileges.map(([index, missingPrivileges]) => (
                <li key={index}>{missingIndexPrivileges(index, missingPrivileges)}</li>
              ))}
            </ul>
          </>
        ) : null,
      featurePrivileges:
        featurePrivileges.length > 0 ? (
          <>
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.featurePrivilegesTitle"
              defaultMessage="Missing Kibana feature privileges:"
            />
            <ul>
              {featurePrivileges.map(([feature, missingPrivileges]) => (
                <li key={feature}>{missingFeaturePrivileges(feature, missingPrivileges)}</li>
              ))}
            </ul>
          </>
        ) : null,
      docs: (
        <ul>
          <li>
            <DetectionsRequirementsLink />
          </li>
          <li>
            <SecuritySolutionRequirementsLink />
          </li>
        </ul>
      ),
    }}
  />
);

interface PrivilegeExplanations {
  [key: string]: {
    [privilegeName: string]: string;
  };
}

const PRIVILEGE_EXPLANATIONS: PrivilegeExplanations = {
  [SECURITY_FEATURE_ID]: {
    all: CANNOT_EDIT_RULES,
  },
  [DEFAULT_SIGNALS_INDEX]: {
    write: CANNOT_EDIT_ALERTS,
  },
  [DEFAULT_LISTS_INDEX]: {
    write: CANNOT_EDIT_LISTS,
  },
  [DEFAULT_ITEMS_INDEX]: {
    write: CANNOT_EDIT_LISTS,
  },
};

const getPrivilegesExplanation = (missingPrivileges: string[], index: string) => {
  const explanationsByPrivilege = Object.entries(PRIVILEGE_EXPLANATIONS).find(([key]) =>
    index.startsWith(key)
  )?.[1];

  return missingPrivileges
    .map((privilege) => explanationsByPrivilege?.[privilege])
    .filter(Boolean)
    .join(' ');
};

const missingIndexPrivileges = (index: string, privileges: string[]) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.missingIndexPrivileges"
    defaultMessage="Missing {privileges} privileges for the {index} index. {explanation}"
    values={{
      privileges: <CommaSeparatedValues values={privileges} />,
      index: <EuiCode>{index}</EuiCode>,
      explanation: getPrivilegesExplanation(privileges, index),
    }}
  />
);

const missingFeaturePrivileges = (feature: string, privileges: string[]) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.missingFeaturePrivileges"
    defaultMessage="Missing {privileges} privileges for the {index} feature. {explanation}"
    values={{
      privileges: <CommaSeparatedValues values={privileges} />,
      index: <EuiCode>{feature}</EuiCode>,
      explanation: getPrivilegesExplanation(privileges, feature),
    }}
  />
);
