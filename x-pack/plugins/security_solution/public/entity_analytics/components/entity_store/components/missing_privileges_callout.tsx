/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiCode } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import { getAllMissingPrivileges } from '../../../../../common/entity_analytics/privileges';

import type { CallOutMessage } from '../../../../common/components/callouts';
import { CallOut } from '../../../../common/components/callouts';
import { CommaSeparatedValues } from '../../../../detections/components/callouts/missing_privileges_callout/comma_separated_values';

interface MissingPrivilegesCalloutProps {
  privileges: EntityAnalyticsPrivileges | undefined;
}

export const MissingPrivilegesCallout = React.memo(
  ({ privileges }: MissingPrivilegesCalloutProps) => {
    if (!privileges || privileges.has_all_required) {
      return null;
    }

    const missingPrivileges = getAllMissingPrivileges(privileges);
    const indexPrivileges = missingPrivileges.elasticsearch.index ?? {};
    const clusterPrivileges = missingPrivileges.elasticsearch.cluster ?? {};
    const featurePrivileges = missingPrivileges.kibana;

    const body = (
      <>
        {indexPrivileges.length > 0 ? (
          <>
            <FormattedMessage
              id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.indexPrivilegesTitle"
              defaultMessage="Missing Elasticsearch index privileges:"
            />
            <ul>
              {indexPrivileges.map(({ indexName, privileges: privilege }) => (
                <li key={indexName}>
                  <FormattedMessage
                    id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.missingIndexPrivileges"
                    defaultMessage="Missing {privileges} privileges for the {index} index."
                    values={{
                      privileges: <CommaSeparatedValues values={privilege} />,
                      index: <EuiCode>{indexName}</EuiCode>,
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {clusterPrivileges.length > 0 ? (
          <>
            <FormattedMessage
              id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.clusterPrivilegesTitle"
              defaultMessage="Missing Elasticsearch cluster privileges:"
            />
            <ul>
              {clusterPrivileges.map((privilege) => (
                <li key={privilege}>
                  <EuiCode>{privilege}</EuiCode>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {featurePrivileges.length > 0 ? (
          <>
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.featurePrivilegesTitle"
              defaultMessage="Missing Kibana feature privileges:"
            />
            <ul>
              {featurePrivileges.map((feature) => (
                <li key={feature}>
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.missingPrivilegesCallOut.messageBody.missingFeaturePrivileges"
                    defaultMessage="Missing privilege for the {feature} feature."
                    values={{
                      feature: <EuiCode>{feature}</EuiCode>,
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </>
    );

    const message: CallOutMessage = {
      type: 'primary',
      id: `missing-entity-store-privileges`,
      title: 'Insufficient privileges to enable the Entity Store',
      description: body,
    };

    return (
      <>
        <EuiSpacer size="l" />
        <CallOut message={message} showDismissButton={false} />
        <EuiSpacer size="l" />
      </>
    );
  }
);
MissingPrivilegesCallout.displayName = 'MissingPrivilegesCallout';
