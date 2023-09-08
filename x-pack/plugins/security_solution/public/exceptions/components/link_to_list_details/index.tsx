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
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';

interface LinkToListDetailsProps {
  linkTitle: string;
  listId: string;
  external?: boolean;
  dataTestSubj?: string;
}
// This component should be removed and moved to @kbn/securitysolution-exception-list-components
// once all the building components get moved

const LinkToListDetailsComponent: FC<LinkToListDetailsProps> = ({
  linkTitle,
  listId,
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
      data-test-subj={`linToListkEuiLink${dataTestSubj ?? ''}`}
      onClick={(e) => {
        e.preventDefault();
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.exceptions,
          path: `/details/${listId}`,
          openInNewTab: true,
        });
      }}
    >
      {linkTitle}
    </EuiLink>
  ) : (
    <SecuritySolutionLinkAnchor
      data-test-subj={`linkToListSecuritySolutionLinkAnchor${dataTestSubj ?? ''}`}
      deepLinkId={SecurityPageName.exceptions}
      path={`/details/${listId}`}
      external={external}
    >
      {linkTitle}
    </SecuritySolutionLinkAnchor>
  );
};

LinkToListDetailsComponent.displayName = 'LinkToListDetailsComponent';

export const LinkToListDetails = React.memo(LinkToListDetailsComponent);

LinkToListDetails.displayName = 'LinkToListDetails';
