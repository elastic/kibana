/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { SecuritySolutionLinkAnchor } from '../../../../../common/components/links';
import { SecurityPageName } from '../../../../../../common/constants';
import { getRuleDetailsTabUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { RuleDetailTabs } from '../../../../../detections/pages/detection_engine/rules/details';

interface LinkAnchorProps {
  referenceName: string;
  referenceId: string;
}

const LinkAnchor: FC<LinkAnchorProps> = ({ referenceName, referenceId }) => {
  return (
    <SecuritySolutionLinkAnchor
      data-test-subj="ruleName"
      deepLinkId={SecurityPageName.rules}
      path={getRuleDetailsTabUrl(referenceId, RuleDetailTabs.alerts)}
    >
      {referenceName}
    </SecuritySolutionLinkAnchor>
  );
};

LinkAnchor.displayName = 'LinkAnchor';

export const ListDetailsLinkAnchor = React.memo(LinkAnchor);

ListDetailsLinkAnchor.displayName = 'ListDetailsLinkAnchor';
