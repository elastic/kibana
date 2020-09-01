/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiSelect,
  EuiButtonEmpty,
  EuiCallOut,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiButton,
} from '@elastic/eui';

import { LearnMoreLink } from './learn_more_link';
import { ErrableFormRow } from './form_errors';
import { useLoadNodes } from '../../../services/api';
import { NodeAttrsDetails } from './node_attrs_details';
import { PhaseWithAllocationAction, Phases } from '../../../services/policies/types';
import { PhaseValidationErrors, propertyof } from '../../../services/policies/policy_validation';

const learnMoreLink = (
  <Fragment>
    <EuiSpacer size="m" />
    <LearnMoreLink
      text={
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.learnAboutShardAllocationLink"
          defaultMessage="Learn about shard allocation"
        />
      }
      docPath="modules-cluster.html#cluster-shard-allocation-settings"
    />
  </Fragment>
);

interface Props<T extends PhaseWithAllocationAction> {
  phase: keyof Phases & string;
  errors?: PhaseValidationErrors<T>;
  phaseData: T;
  setPhaseData: (dataKey: keyof T & string, value: string) => void;
  isShowingErrors: boolean;
}
export const NodeAllocation = <T extends PhaseWithAllocationAction>({
  phase,
  setPhaseData,
  errors,
  phaseData,
  isShowingErrors,
}: React.PropsWithChildren<Props<T>>) => {
  const { isLoading, data: nodes, error, sendRequest } = useLoadNodes();

  const [selectedNodeAttrsForDetails, setSelectedNodeAttrsForDetails] = useState<string | null>(
    null
  );

  if (isLoading) {
    return (
      <Fragment>
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  if (error) {
    const { statusCode, message } = error;
    return (
      <Fragment>
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesLoadingFailedTitle"
              defaultMessage="Unable to load node attributes"
            />
          }
          color="danger"
        >
          <p>
            {message} ({statusCode})
          </p>
          <EuiButton onClick={sendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        </EuiCallOut>

        <EuiSpacer size="xl" />
      </Fragment>
    );
  }

  let nodeOptions = Object.keys(nodes).map((attrs) => ({
    text: `${attrs} (${nodes[attrs].length})`,
    value: attrs,
  }));

  nodeOptions.sort((a, b) => a.value.localeCompare(b.value));
  if (nodeOptions.length) {
    nodeOptions = [
      {
        text: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.defaultNodeAllocation', {
          defaultMessage: "Default allocation (don't use attributes)",
        }),
        value: '',
      },
      ...nodeOptions,
    ];
  }
  if (!nodeOptions.length) {
    return (
      <Fragment>
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingLabel"
              defaultMessage="No node attributes configured in elasticsearch.yml"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingDescription"
            defaultMessage="You can't control shard allocation without node attributes."
          />
          {learnMoreLink}
        </EuiCallOut>

        <EuiSpacer size="xl" />
      </Fragment>
    );
  }

  // check that this string is a valid property
  const nodeAttrsProperty = propertyof<T>('selectedNodeAttrs');

  return (
    <Fragment>
      <ErrableFormRow
        id={`${phase}-${nodeAttrsProperty}`}
        label={i18n.translate('xpack.indexLifecycleMgmt.editPolicy.nodeAllocationLabel', {
          defaultMessage: 'Select a node attribute to control shard allocation',
        })}
        isShowingErrors={isShowingErrors}
        errors={errors?.selectedNodeAttrs}
      >
        <EuiSelect
          id={`${phase}-${nodeAttrsProperty}`}
          value={phaseData.selectedNodeAttrs || ' '}
          options={nodeOptions}
          onChange={(e) => {
            setPhaseData(nodeAttrsProperty, e.target.value);
          }}
        />
      </ErrableFormRow>
      {!!phaseData.selectedNodeAttrs ? (
        <EuiButtonEmpty
          style={{ maxWidth: 400 }}
          data-test-subj={`${phase}-viewNodeDetailsFlyoutButton`}
          flush="left"
          iconType="eye"
          onClick={() => setSelectedNodeAttrsForDetails(phaseData.selectedNodeAttrs)}
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.viewNodeDetailsButton"
            defaultMessage="View a list of nodes attached to this configuration"
          />
        </EuiButtonEmpty>
      ) : null}
      {learnMoreLink}
      <EuiSpacer size="m" />

      {selectedNodeAttrsForDetails ? (
        <NodeAttrsDetails
          selectedNodeAttrs={selectedNodeAttrsForDetails}
          close={() => setSelectedNodeAttrsForDetails(null)}
        />
      ) : null}
    </Fragment>
  );
};
