/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { CoreStart } from '../../../../../../src/core/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface RuleNameProps {
  name: string;
  id: string;
}

const appendSearch = (search?: string) =>
  isEmpty(search) ? '' : `${search?.startsWith('?') ? search : `?${search}`}`;

const RuleNameComponents = ({ name, id }: RuleNameProps) => {
  const { navigateToApp, getUrlForApp } = useKibana<CoreStart>().services.application;

  const hrefRuleDetails = useMemo(
    () =>
      getUrlForApp('securitySolution', {
        deepLinkId: 'rules',
        path: `/id/${id}${appendSearch(window.location.search)}`,
      }),
    [getUrlForApp, id]
  );
  const goToRuleDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp('securitySolution', {
        deepLinkId: 'rules',
        path: `/id/${id}${appendSearch(window.location.search)}`,
      });
    },
    [navigateToApp, id]
  );
  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={hrefRuleDetails} onClick={goToRuleDetails}>
      {name}
    </EuiLink>
  );
};

export const RuleName = React.memo(RuleNameComponents);
