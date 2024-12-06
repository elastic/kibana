/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { EuiPopover, EuiText, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { TITLE } from './translations';
import {
  BASE_VERSION,
  CURRENT_VERSION,
  FINAL_VERSION,
  TARGET_VERSION,
} from './versions_picker/translations';
import { UPDATE_BUTTON_LABEL } from '../../../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/translations';
import { FINAL_UPDATE } from '../final_side/translations';

/**
 * Theme doesn't expose width variables. Using provided size variables will require
 * multiplying it by another magic constant.
 *
 * 320px width looks
 * like a [commonly used width in EUI](https://github.com/search?q=repo%3Aelastic%2Feui%20320&type=code).
 */
const POPOVER_WIDTH = 320;

interface ComparisonSideHelpInfoProps {
  shouldShowBaseVersion: boolean;
}

export function ComparisonSideHelpInfo({
  shouldShowBaseVersion,
}: ComparisonSideHelpInfoProps): JSX.Element {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  const button = (
    <EuiButtonIcon
      iconType="questionInCircle"
      onClick={togglePopover}
      aria-label="Open help popover"
    />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={togglePopover}>
      <EuiText style={{ width: POPOVER_WIDTH }} size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.rules.upgradeRules.comparisonSide.upgradeHelpText"
          defaultMessage="The {title} lets you compare the values of a field across different versions of a rule: {versions} The differences are shown as JSON, highlighting additions, deletions, and modifications. Use this view to review and understand changes across versions."
          values={{
            title: <strong>{TITLE}</strong>,
            versions: (
              <>
                <br />
                <ul>
                  {shouldShowBaseVersion && (
                    <li>
                      <strong>{BASE_VERSION}</strong> {'-'} {BASE_VERSION_EXPLANATION}
                    </li>
                  )}
                  <li>
                    <strong>{CURRENT_VERSION}</strong> {'-'} {CURRENT_VERSION_EXPLANATION}
                  </li>
                  <li>
                    <strong>{TARGET_VERSION}</strong> {'-'} {TARGET_VERSION_EXPLANATION}
                  </li>
                  <li>
                    <strong>{FINAL_VERSION}</strong> {'-'} {FINAL_VERSION_EXPLANATION}
                  </li>
                </ul>
              </>
            ),
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}

const BASE_VERSION_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.baseVersionExplanation',
  {
    defaultMessage: 'the value the field had when the rule was first installed.',
  }
);

const CURRENT_VERSION_EXPLANATION = (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.currentVersionExplanation"
    defaultMessage="field value in your currently installed rule."
  />
);

const TARGET_VERSION_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.targetVersionExplanation',
  {
    defaultMessage: 'field value in Elastic’s latest update.',
  }
);

const FINAL_VERSION_EXPLANATION = (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.finalVersionExplanation"
    defaultMessage="field value that will be saved once you click {updateButtonLabel}. You can edit this value in the {finalUpdateSectionLabel} section."
    values={{
      updateButtonLabel: <i>{UPDATE_BUTTON_LABEL}</i>,
      finalUpdateSectionLabel: <i>{FINAL_UPDATE}</i>,
    }}
  />
);
