/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetsLocatorParams } from '@kbn/deeplinks-observability';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { getRouterLinkProps } from '@kbn/router-utils';
import { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';

export const buildLogsExplorerLocatorConfig = ({
  locator,
  kuery,
  from,
  to,
}: {
  locator: LocatorPublic<AllDatasetsLocatorParams>;
  kuery?: string;
  from: string;
  to: string;
}): {
  logsExplorerLinkProps: RouterLinkProps;
} => {
  const params: AllDatasetsLocatorParams = {
    timeRange: {
      from,
      to,
    },
    ...(kuery && {
      query: { language: 'kuery', query: kuery },
    }),
  };

  const urlToLogsExplorer = locator.getRedirectUrl(params);

  const navigateToLogsExplorer = () => {
    locator.navigate(params);
  };

  const logsExplorerLinkProps = getRouterLinkProps({
    href: urlToLogsExplorer,
    onClick: navigateToLogsExplorer,
  });

  return { logsExplorerLinkProps };
};
