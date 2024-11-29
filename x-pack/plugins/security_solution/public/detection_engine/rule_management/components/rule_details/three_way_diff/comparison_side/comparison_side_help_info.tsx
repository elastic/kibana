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

/**
 * Theme doesn't expose width variables. Using provided size variables will require
 * multiplying it by another magic constant.
 *
 * 320px width looks
 * like a [commonly used width in EUI](https://github.com/search?q=repo%3Aelastic%2Feui%20320&type=code).
 */
const POPOVER_WIDTH = 320;

export function ComparisonSideHelpInfo(): JSX.Element {
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
          id="xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeHelpText"
          defaultMessage="{title} shows field's JSON diff between prebuilt rule field versions affecting the rule update process. {versions}"
          values={{
            title: <strong>{TITLE}</strong>,
            versions: (
              <>
                <br />
                <ul>
                  <li>
                    <strong>{BASE_VERSION}</strong> {'-'} {BASE_VERSION_EXPLANATION}
                  </li>
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
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeHelpText.baseVersionExplanation',
  {
    defaultMessage: 'version originally installed from Elastic prebuilt rules package',
  }
);

const CURRENT_VERSION_EXPLANATION = (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeHelpText.currentVersionExplanation"
    defaultMessage="current version including modification made after prebuilt rule installation. With lack of modifications it matches with {base}."
    values={{
      base: <strong>{BASE_VERSION}</strong>,
    }}
  />
);

const TARGET_VERSION_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeHelpText.currentVersionExplanation',
  {
    defaultMessage: 'version coming from a new version of Elastic prebuilt rules package',
  }
);

const FINAL_VERSION_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeHelpText.currentVersionExplanation',
  {
    defaultMessage:
      'version used to the update the rule. Initial value is suggested by the diff algorithm.',
  }
);
