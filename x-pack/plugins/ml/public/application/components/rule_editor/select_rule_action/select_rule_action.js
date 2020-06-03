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

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { DetectorDescriptionList } from '../components/detector_description_list';
import { RuleActionPanel } from './rule_action_panel';
import { FormattedMessage } from '@kbn/i18n/react';

export function SelectRuleAction({
  job,
  anomaly,
  setEditRuleIndex,
  updateRuleAtIndex,
  deleteRuleAtIndex,
  addItemToFilterList,
}) {
  const detectorIndex = anomaly.detectorIndex;
  const detector = job.analysis_config.detectors[detectorIndex];
  const rules = detector.custom_rules || [];
  let ruleActionPanels;
  if (rules.length > 0) {
    ruleActionPanels = rules.map((rule, index) => {
      return (
        <React.Fragment key={`rule_panel_${index}_${rules.length}`}>
          <RuleActionPanel
            job={job}
            ruleIndex={index}
            anomaly={anomaly}
            setEditRuleIndex={setEditRuleIndex}
            updateRuleAtIndex={updateRuleAtIndex}
            deleteRuleAtIndex={deleteRuleAtIndex}
            addItemToFilterList={addItemToFilterList}
          />
          <EuiSpacer size="l" />
        </React.Fragment>
      );
    });
  }

  return (
    <div className="select-rule-action">
      {rules.length > 0 && (
        <React.Fragment>
          <DetectorDescriptionList job={job} detector={detector} anomaly={anomaly} />
          <EuiSpacer size="m" />
          {ruleActionPanels}
          <EuiSpacer size="m" />
          <EuiText style={{ display: 'inline' }}>
            <FormattedMessage
              id="xpack.ml.ruleEditor.selectRuleAction.orText"
              defaultMessage="Or&nbsp;"
            />
          </EuiText>
        </React.Fragment>
      )}
      <EuiLink onClick={() => setEditRuleIndex(rules.length)}>
        <FormattedMessage
          id="xpack.ml.ruleEditor.selectRuleAction.createRuleLinkText"
          defaultMessage="create a rule"
        />
      </EuiLink>
    </div>
  );
}
SelectRuleAction.propTypes = {
  job: PropTypes.object.isRequired,
  anomaly: PropTypes.object.isRequired,
  setEditRuleIndex: PropTypes.func.isRequired,
  updateRuleAtIndex: PropTypes.func.isRequired,
  deleteRuleAtIndex: PropTypes.func.isRequired,
  addItemToFilterList: PropTypes.func.isRequired,
};
