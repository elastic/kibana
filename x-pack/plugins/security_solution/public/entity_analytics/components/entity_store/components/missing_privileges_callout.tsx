/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiCode, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LineClamp } from '../../../../common/components/line_clamp';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import { getAllMissingPrivileges } from '../../../../../common/entity_analytics/privileges';
import { CommaSeparatedValues } from '../../../../detections/components/callouts/missing_privileges_callout/comma_separated_values';

interface MissingPrivilegesCalloutProps {
  privileges: EntityAnalyticsPrivileges;
}

/**
 * The height of the callout when the content is clamped.
 * The value was chosen based on trial and error.
 */
const LINE_CLAMP_HEIGHT = '4.4em';

export const MissingPrivilegesCallout = React.memo(
  ({ privileges }: MissingPrivilegesCalloutProps) => {
    const missingPrivileges = getAllMissingPrivileges(privileges);
    const indexPrivileges = missingPrivileges.elasticsearch.index ?? {};
    const clusterPrivileges = missingPrivileges.elasticsearch.cluster ?? {};
    const featurePrivileges = missingPrivileges.kibana;
    const id = `missing-entity-store-privileges`;
    return (
      <EuiCallOut
        color="primary"
        title={
          <FormattedMessage
            id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.title"
            defaultMessage="Insufficient privileges to enable the Entity Store"
          />
        }
        iconType={'iInCircle'}
        data-test-subj={`callout-${id}`}
        data-test-messages={`[${id}]`}
      >
        <LineClamp maxHeight="100%" lineClampHeight={LINE_CLAMP_HEIGHT}>
          <EuiText size="s">
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
                  id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.featurePrivilegesTitle"
                  defaultMessage="Missing Kibana feature privileges:"
                />
                <ul>
                  {featurePrivileges.map((feature) => (
                    <li key={feature}>
                      <FormattedMessage
                        id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.messageBody.missingFeaturePrivileges"
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
          </EuiText>
        </LineClamp>
      </EuiCallOut>
    );
  }
);
MissingPrivilegesCallout.displayName = 'MissingPrivilegesCallout';
