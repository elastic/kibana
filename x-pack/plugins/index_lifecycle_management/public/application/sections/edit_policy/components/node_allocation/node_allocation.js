/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiButtonEmpty, EuiCallOut, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import { PHASE_NODE_ATTRS } from '../../../../constants';
import { LearnMoreLink } from '../../../components/learn_more_link';
import { ErrableFormRow } from '../../form_errors';

const learnMoreLinks = (
  <Fragment>
    <EuiSpacer size="s" />
    <EuiSpacer size="s" />
    <LearnMoreLink
      text={
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.learnAboutShardAllocationLink"
          defaultMessage="Learn about shard allocation"
        />
      }
      docPath="shards-allocation.html"
    />
  </Fragment>
);

export class NodeAllocation extends Component {
  componentDidMount() {
    this.props.fetchNodes();
  }

  render() {
    const {
      phase,
      setPhaseData,
      isShowingErrors,
      phaseData,
      showNodeDetailsFlyout,
      nodeOptions,
      errors,
    } = this.props;
    if (!nodeOptions) {
      return (
        <Fragment>
          <EuiLoadingSpinner size="xl" />
          <EuiSpacer size="m" />
        </Fragment>
      );
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
            {learnMoreLinks}
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
        ) : (
          <div />
        )}
        {learnMoreLinks}
        <EuiSpacer size="m" />
      </Fragment>
    );
  }
}
