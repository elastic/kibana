/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for rendering the form fields for editing the conditions section of a rule.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

import { ConditionExpression } from './condition_expression';


export function ConditionsSection({
  isEnabled,
  conditions,
  addCondition,
  updateCondition,
  deleteCondition }) {

  if (isEnabled === false) {
    return null;
  }

  let expressions = [];
  if (conditions !== undefined) {
    expressions = conditions.map((condition, index) => {
      return (
        <ConditionExpression
          key={index}
          index={index}
          appliesTo={condition.applies_to}
          operator={condition.operator}
          value={condition.value}
          updateCondition={updateCondition}
          deleteCondition={deleteCondition}
        />
      );
    });
  }

  return (
    <React.Fragment>
      {expressions}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        onClick={() => addCondition()}
      >
        Add new condition
      </EuiButtonEmpty>
    </React.Fragment>
  );

}
ConditionsSection.propTypes = {
  isEnabled: PropTypes.bool.isRequired,
  conditions: PropTypes.array,
  addCondition: PropTypes.func.isRequired,
  updateCondition: PropTypes.func.isRequired,
  deleteCondition: PropTypes.func.isRequired
};
