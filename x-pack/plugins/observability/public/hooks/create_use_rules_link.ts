/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  UseLinkPropsOptions,
  useLinkProps,
  type LinkDescriptor,
} from '@kbn/observability-shared-plugin/public';
import rison from '@kbn/rison';
import { useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../utils/kibana_react';

export const createUseRulesLink =
  () =>
  (options: UseLinkPropsOptions = {}) => {
    const linkProps = {
      app: 'observability',
      pathname: '/alerts/rules',
    };

    return useLinkProps(linkProps, options);
  };

export const crateInfraNodeDetailsLink =
  ({
    assetType,
    assetId,
    search,
  }: {
    assetType: 'host';
    assetId: string;
    search: LinkDescriptor['search'];
  }) =>
  (options: UseLinkPropsOptions = {}) => {
    const location = useLocation();
    const {
      services: {
        application: { currentAppId$ },
      },
    } = useKibana();

    const appId = useObservable(currentAppId$);

    const linkProps = {
      app: 'metrics',
      pathname: `link-to/${assetType}-detail/${assetId}`,
      search: {
        ...search,
        ...(location.pathname
          ? {
              state: rison.encodeUnknown({
                originAppId: appId,
                originPathname: location.pathname,
                originSearch: location.search,
              }),
            }
          : undefined),
      },
    };

    return useLinkProps(linkProps, options);
  };
