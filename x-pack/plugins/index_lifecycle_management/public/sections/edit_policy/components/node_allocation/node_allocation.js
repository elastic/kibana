/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiSelect, EuiButtonEmpty, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { PHASE_NODE_ATTRS } from '../../../../store/constants';
import { ErrableFormRow } from '../../form_errors';
import { LearnMoreLink } from '../../../components/learn_more_link';
const learnMoreLinks = (
  <Fragment>
    <br />
    <LearnMoreLink
      docPath="indices-rollover-index.html"
      text={
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.learnAboutNodeAttributesLink"
          defaultMessage="Learn about node attributes"
        />
      }
    />
    <br />
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
class NodeAllocationUi extends Component {
  componentDidMount() {
    this.props.fetchNodes();
  }
  render() {
    const {
      phase,
      setPhaseData,
      intl,
      isShowingErrors,
      phaseData,
      showNodeDetailsFlyout,
      nodeOptions,
      errors
    } = this.props;
    if (!nodeOptions.length) {
      return (
        <Fragment>
          <EuiCallOut
            style={{ maxWidth: 400 }}
            title={
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingLabel"
                defaultMessage="No node attributes configured"
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
      <ErrableFormRow
        id={`${phase}.${PHASE_NODE_ATTRS}`}
        label={intl.formatMessage({
          id: 'xpack.indexLifecycleMgmt.editPolicy.nodeAllocationLabel',
          defaultMessage: 'Select a node attribute to control shard allocation',
        })}
        errorKey={PHASE_NODE_ATTRS}
        isShowingErrors={isShowingErrors}
        errors={errors}
        helpText={
          phaseData[PHASE_NODE_ATTRS] ? (
            <EuiButtonEmpty
              flush="left"
              iconType="eye"
              onClick={() => showNodeDetailsFlyout(phaseData[PHASE_NODE_ATTRS])}
            >
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.viewNodeDetailsButton"
                defaultMessage="View a list of nodes attached to this configuration"
              />
            </EuiButtonEmpty>
          ) : null
        }
      >
        <EuiSelect
          id={`${phase}.${PHASE_NODE_ATTRS}`}
          value={phaseData[PHASE_NODE_ATTRS] || ' '}
          options={nodeOptions}
          onChange={async e => {
            await setPhaseData(PHASE_NODE_ATTRS, e.target.value);
          }}
        />
        {learnMoreLinks}
      </ErrableFormRow>
    );
  }
}
export const NodeAllocation = injectI18n(NodeAllocationUi);
