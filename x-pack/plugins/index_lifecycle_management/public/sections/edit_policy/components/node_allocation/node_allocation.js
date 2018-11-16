/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiSelect, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { PHASE_NODE_ATTRS } from '../../../../store/constants';
import { ErrableFormRow } from '../../form_errors';
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
      return null;
    }
    return (
      <ErrableFormRow
        id={`${phase}.${PHASE_NODE_ATTRS}`}
        label={intl.formatMessage({
          id: 'xpack.indexLifecycleMgmt.editPolicy.nodeAllocationLabel',
          defaultMessage: 'Choose where to allocate indices by node attribute',
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
          value={phaseData[PHASE_NODE_ATTRS] || ' '}
          options={nodeOptions}
          onChange={async e => {
            await setPhaseData(PHASE_NODE_ATTRS, e.target.value);
          }}
        />
      </ErrableFormRow>
    );
  }
}
export const NodeAllocation = injectI18n(NodeAllocationUi);
