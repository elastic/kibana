/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiLink } from '@elastic/eui';

import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { RuleDetailTabs } from '../../../detection_engine/rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { getRuleDetailsTabUrl } from '../../../common/components/link_to/redirect_to_detection_engine';
import { useKibana } from '../../../common/lib/kibana';

interface LinkToRuleDetailsProps {
  referenceName: string;
  referenceId: string;
  external?: boolean;
  dataTestSubj?: string;
}
// This component should be removed and moved to @kbn/securitysolution-exception-list-components
// once all the building components get moved

const LinkToRuleDetailsComponent: FC<LinkToRuleDetailsProps> = ({
  referenceName,
  referenceId,
  external,
  dataTestSubj,
}) => {
  const {
    application: { navigateToApp },
  } = useKibana().services;

  return external ? (
    // To achieve a consistent user experience similar to an external link,
    // it's necessary to employ the href attribute in this context.
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink
      target="_blank"
      href="#"
      external={external}
      data-test-subj={`linkToRuleEuiLink${dataTestSubj ?? ''}`}
      onClick={(e) => {
        e.preventDefault();
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.rules,
          path: getRuleDetailsTabUrl(referenceId, RuleDetailTabs.alerts),
          openInNewTab: true,
        });
      }}
    >
      {referenceName}
    </EuiLink>
  ) : (
    <SecuritySolutionLinkAnchor
      data-test-subj={`linkToRuleSecuritySolutionLinkAnchor${dataTestSubj ?? ''}`}
      deepLinkId={SecurityPageName.rules}
      path={getRuleDetailsTabUrl(referenceId, RuleDetailTabs.alerts)}
      external={external}
    >
      {referenceName}
    </SecuritySolutionLinkAnchor>
  );
};

LinkToRuleDetailsComponent.displayName = 'LinkToRuleDetailsComponent';

export const LinkToRuleDetails = React.memo(LinkToRuleDetailsComponent);

LinkToRuleDetails.displayName = 'LinkToRuleDetails';
