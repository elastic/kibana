/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { SnapshotConfig } from '../../../../../common/types';
import { CollapsibleFeatureStatesList } from '../../collapsible_lists';

export const SnapshotFeatureStatesSummary: React.FunctionComponent<SnapshotConfig> = ({
  featureStates,
}) => {
  // When a policy that includes featureStates: ['none'] is executed, the resulting
  // snapshot wont include the `none` in the featureStates array but instead will
  // return an empty array.
  const hasNoFeatureStates = !featureStates || featureStates.length === 0;

  return (
    <EuiFlexItem data-test-subj="snapshotFeatureStatesSummary">
      <EuiDescriptionList textStyle="reverse">
        <EuiDescriptionListTitle>
          <FormattedMessage
            id="xpack.snapshotRestore.summary.snapshotFeatureStatesLabel"
            defaultMessage="Include feature state {hasSpecificFeatures, plural, one {from} other {}}"
            values={{ hasSpecificFeatures: !hasNoFeatureStates ? 1 : 0 }}
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription data-test-subj="value">
          {hasNoFeatureStates ? (
            <FormattedMessage
              id="xpack.snapshotRestore.summary.snapshotNoFeatureStatesLabel"
              defaultMessage="No"
            />
          ) : (
            <CollapsibleFeatureStatesList featureStates={featureStates} />
          )}
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
  );
};
