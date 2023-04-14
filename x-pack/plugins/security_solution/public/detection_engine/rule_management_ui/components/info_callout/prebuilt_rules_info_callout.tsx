/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import React, { memo } from 'react';
import * as i18n from '../../../../detections/components/rules/pre_packaged_rules/translations';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { FormattedMessage } from '@kbn/i18n-react';

interface PrebuiltRulesInfoCalloutParams {}

const PrebuiltRulesInfoCalloutComponent = () => {
  const { data: preBuiltRulesStatus } = usePrebuiltRulesStatus();
  const rulesToUpdated = preBuiltRulesStatus?.attributes?.stats.num_prebuilt_rules_to_upgrade ?? 0;

  // if (rulesToUpdated > 0) {
  //   return <></>;
  // }

  const calloutTitle = (
    <div
      css={`
        display: inline-block;
        width: 97%;
      `}
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none">
            <EuiTextColor
              color="default"
              css={`
                font-weight: 400;
              `}
            >
              <FormattedMessage
                id="xpack.securitySolution.detectionEngine.rules.updatePrePackagedRulesTitle"
                defaultMessage="Updates available for installed rules. Review and update in&nbsp;{link}."
                values={{
                  link: (
                    <EuiLink
                      css={`
                        font-weight: 400;
                      `}
                      data-test-subj="failureToastLink"
                    >
                      {i18n.RULE_UPDATES_LINK}
                    </EuiLink>
                  ),
                }}
              />
            </EuiTextColor>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            css={`
              font-weight: 400;
            `}
            href="#/navigation/link"
          >
            {i18n.DISMISS}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );

  return (
    <EuiCallOut
      size="s"
      iconType="iInCircle"
      title={calloutTitle}
      data-test-subj="update-callout"
    />
  );
};

export const PrebuiltRulesInfoCallout = memo(PrebuiltRulesInfoCalloutComponent);
