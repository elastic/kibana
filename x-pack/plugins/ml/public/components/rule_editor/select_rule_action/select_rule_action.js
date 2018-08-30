/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for selecting the rule to edit, create or delete.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { DetectorDescriptionList } from '../components/detector_description_list';
import { RuleActionPanel } from './rule_action_panel';


export function SelectRuleAction({
  job,
  anomaly,
  detectorIndex,
  setEditRuleIndex,
  deleteRuleAtIndex }) {

  const detector = job.analysis_config.detectors[detectorIndex];
  const rules = detector.custom_rules || [];
  let ruleActionPanels;
  if (rules.length > 0) {
    ruleActionPanels = rules.map((rule, index) => {
      return (
        <React.Fragment key={`rule_panel_${index}`}>
          <RuleActionPanel
            job={job}
            detectorIndex={detectorIndex}
            ruleIndex={index}
            anomaly={anomaly}
            setEditRuleIndex={setEditRuleIndex}
            deleteRuleAtIndex={deleteRuleAtIndex}
          />
          <EuiSpacer size="l"/>
        </React.Fragment>
      );
    });
  }

  return (
    <div className="select-rule-action">
      {rules.length > 0 &&
        <React.Fragment>
          <DetectorDescriptionList
            job={job}
            detector={detector}
          />
          <EuiSpacer size="m" />
          {ruleActionPanels}
          <EuiSpacer size="m" />
          <EuiText style={{ display: 'inline' }}>
            or&nbsp;
          </EuiText>
        </React.Fragment>
      }
      <EuiLink
        onClick={() => setEditRuleIndex(rules.length)}
      >
        create a rule
      </EuiLink>
    </div>
  );

}
SelectRuleAction.propTypes = {
  job: PropTypes.object.isRequired,
  anomaly: PropTypes.object.isRequired,
  detectorIndex: PropTypes.number.isRequired,
  setEditRuleIndex: PropTypes.func.isRequired,
  deleteRuleAtIndex: PropTypes.func.isRequired,
};
