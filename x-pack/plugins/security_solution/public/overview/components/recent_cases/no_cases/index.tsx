/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';

import { APP_ID } from '../../../../../common/constants';
import { getCreateCaseUrl } from '../../../../common/components/link_to/redirect_to_case';
import { LinkAnchor } from '../../../../common/components/links';
import { useFormatUrl } from '../../../../common/components/link_to';
import * as i18n from '../translations';
import { useKibana } from '../../../../common/lib/kibana';
import { SecurityPageName } from '../../../../app/types';

const NoCasesComponent = () => {
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { navigateToApp } = useKibana().services.application;

  const goToCreateCase = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.hosts}`, {
        path: getCreateCaseUrl(search),
      });
    },
    [navigateToApp, search]
  );
  const newCaseLink = useMemo(
    () => (
      <LinkAnchor
        onClick={goToCreateCase}
        href={formatUrl(getCreateCaseUrl())}
      >{` ${i18n.START_A_NEW_CASE}`}</LinkAnchor>
    ),
    [formatUrl, goToCreateCase]
  );

  return (
    <>
      <span>{i18n.NO_CASES}</span>
      {newCaseLink}
      {'!'}
    </>
  );
};

NoCasesComponent.displayName = 'NoCasesComponent';

export const NoCases = React.memo(NoCasesComponent);
