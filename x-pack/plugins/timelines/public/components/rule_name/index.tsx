/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface RuleNameProps {
  name: string;
  id: string;
  appId: string;
}

const appendSearch = (search?: string) =>
  isEmpty(search) ? '' : `${search?.startsWith('?') ? search : `?${search}`}`;

const RuleNameComponents = ({ name, id, appId }: RuleNameProps) => {
  const { navigateToApp, getUrlForApp } = useKibana<CoreStart>().services.application;

  const hrefRuleDetails = useMemo(
    () =>
      getUrlForApp(appId, {
        deepLinkId: 'rules',
        path: `/id/${id}${appendSearch(window.location.search)}`,
      }),
    [getUrlForApp, id, appId]
  );
  const goToRuleDetails = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(appId, {
        deepLinkId: 'rules',
        path: `/id/${id}${appendSearch(window.location.search)}`,
      });
    },
    [navigateToApp, id, appId]
  );
  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink href={hrefRuleDetails} onClick={goToRuleDetails}>
      {name}
    </EuiLink>
  );
};

export const RuleName = React.memo(RuleNameComponents);
