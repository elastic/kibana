/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useToggle } from 'react-use';
import { EuiPopover, EuiText, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as defineRuleI18n from '../../../rule_creation_ui/components/step_define_rule/translations';
import * as i18n from './translations';

/**
 * Theme doesn't expose width variables. Using provided size variables will require
 * multiplying it by another magic constant.
 *
 * 320px width looks
 * like a [commonly used width in EUI](https://github.com/search?q=repo%3Aelastic%2Feui%20320&type=code).
 */
const POPOVER_WIDTH = 320;

export function RequiredFieldsHelpInfo(): JSX.Element {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  const button = (
    <EuiButtonIcon
      iconType="questionInCircle"
      onClick={togglePopover}
      aria-label={i18n.OPEN_HELP_POPOVER_ARIA_LABEL}
    />
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={togglePopover}>
      <EuiText style={{ width: POPOVER_WIDTH }} size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.fieldRequiredFieldsHelpText"
          defaultMessage="Create an informational list of fields and data types this rule needs to function. Select fields in the rule's {source} index patterns or data view, or type in custom fields."
          values={{
            source: <strong>{defineRuleI18n.SOURCE}</strong>,
          }}
        />
      </EuiText>
    </EuiPopover>
  );
}
