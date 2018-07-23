/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * Panel with a description of a rule and a list of actions that can be performed on the rule.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiDescriptionList,
  EuiLink,
  EuiPanel,
} from '@elastic/eui';

import { DeleteRuleModal } from './delete_rule_modal';
import { buildRuleDescription } from '../utils';

function getEditRuleLink(ruleIndex, setEditRuleIndex) {
  return (
    <EuiLink
      onClick={() => setEditRuleIndex(ruleIndex)}
    >
      Edit rule
    </EuiLink>
  );
}

function getDeleteRuleLink(ruleIndex, deleteRuleAtIndex) {
  return (
    <DeleteRuleModal
      ruleIndex={ruleIndex}
      deleteRuleAtIndex={deleteRuleAtIndex}
    />
  );
}

export function RuleActionPanel({
  job,
  detectorIndex,
  ruleIndex,
  setEditRuleIndex,
  deleteRuleAtIndex,
}) {
  const detector = job.analysis_config.detectors[detectorIndex];
  const rules = detector.custom_rules;
  if (rules === undefined || ruleIndex >= rules.length) {
    return null;
  }

  const rule = rules[ruleIndex];

  const descriptionListItems = [
    {
      title: 'rule',
      description: buildRuleDescription(rule),
    },
    {
      title: 'actions',
      description: getEditRuleLink(ruleIndex, setEditRuleIndex),
    },
    {
      title: '',
      description: getDeleteRuleLink(ruleIndex, deleteRuleAtIndex)
    }
  ];

  return (
    <EuiPanel paddingSize="m" className="select-rule-action-panel">
      <EuiDescriptionList
        type="column"
        listItems={descriptionListItems}
      />
    </EuiPanel>
  );
}
RuleActionPanel.propTypes = {
  detectorIndex: PropTypes.number.isRequired,
  ruleIndex: PropTypes.number.isRequired,
  setEditRuleIndex: PropTypes.func.isRequired,
  deleteRuleAtIndex: PropTypes.func.isRequired,
};

