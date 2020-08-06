/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
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

import { PHASE_NODE_ATTRS } from '../../../../constants';
import { LearnMoreLink } from '../../../components/learn_more_link';
import { ErrableFormRow } from '../../form_errors';
import { useLoadNodes } from '../../../../services/api';

interface Props {
  phase: string;
  setPhaseData: (dataKey: string, value: any) => void;
  showNodeDetailsFlyout: (nodeAttrs: any) => void;
  errors: any;
  phaseData: any;
  isShowingErrors: boolean;
}

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

export const NodeAllocation: React.FunctionComponent<Props> = ({
  phase,
  setPhaseData,
  showNodeDetailsFlyout,
  errors,
  phaseData,
  isShowingErrors,
}) => {
  const { isLoading, data: nodes, error, sendRequest } = useLoadNodes();

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

  return (
    <Fragment>
      <ErrableFormRow
        id={`${phase}-${PHASE_NODE_ATTRS}`}
        label={i18n.translate('xpack.indexLifecycleMgmt.editPolicy.nodeAllocationLabel', {
          defaultMessage: 'Select a node attribute to control shard allocation',
        })}
        errorKey={PHASE_NODE_ATTRS}
        isShowingErrors={isShowingErrors}
        errors={errors}
      >
        <EuiSelect
          id={`${phase}-${PHASE_NODE_ATTRS}`}
          value={phaseData[PHASE_NODE_ATTRS] || ' '}
          options={nodeOptions}
          onChange={(e) => {
            setPhaseData(PHASE_NODE_ATTRS, e.target.value);
          }}
        />
      </ErrableFormRow>
      {!!phaseData[PHASE_NODE_ATTRS] ? (
        <EuiButtonEmpty
          style={{ maxWidth: 400 }}
          data-test-subj={`${phase}-viewNodeDetailsFlyoutButton`}
          flush="left"
          iconType="eye"
          onClick={() => showNodeDetailsFlyout(phaseData[PHASE_NODE_ATTRS])}
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.viewNodeDetailsButton"
            defaultMessage="View a list of nodes attached to this configuration"
          />
        </EuiButtonEmpty>
      ) : null}
      {learnMoreLink}
      <EuiSpacer size="m" />
    </Fragment>
  );
};
