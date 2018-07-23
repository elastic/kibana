/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for rendering the form fields for editing the actions section of a rule.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { ACTION } from '../../../common/constants/detector_rule';

export function ActionsSection({
  actions,
  onSkipResultChange,
  onSkipModelUpdateChange }) {

  return (
    <React.Fragment>
      <EuiText>
        <p>
          Choose the action(s) to take when the rule matches an anomaly.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id="skip_result_cb"
            label="Skip result (recommended)"
            checked={actions.indexOf(ACTION.SKIP_RESULT) > -1}
            onChange={onSkipResultChange}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content="Result will not be created but the model will be updated by the series value"
            size="s"
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id="skip_model_update_cb"
            label="Skip model update"
            checked={actions.indexOf(ACTION.SKIP_MODEL_UPDATE) > -1}
            onChange={onSkipModelUpdateChange}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content="The series value will not be used to update the model but anomalous records will be created"
            size="s"
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );

}
ActionsSection.propTypes = {
  actions: PropTypes.array.isRequired,
  onSkipResultChange: PropTypes.func.isRequired,
  onSkipModelUpdateChange: PropTypes.func.isRequired
};
