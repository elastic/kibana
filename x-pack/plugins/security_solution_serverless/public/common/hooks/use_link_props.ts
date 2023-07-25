/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID, type SecurityPageName } from '@kbn/security-solution-plugin/common';
import { useMemo, useCallback, type MouseEventHandler, type MouseEvent } from 'react';
import { useKibana, type Services } from '../services';

interface LinkProps {
  onClick: MouseEventHandler;
  href: string;
}

interface GetLinkPropsParams {
  deepLinkId?: SecurityPageName;
  path?: string;
  appId?: string;
  onClick?: MouseEventHandler;
}

export type GetLinkProps = (params: GetLinkPropsParams) => LinkProps;

export const useLinkProps: GetLinkProps = (props) => {
  const { application } = useKibana().services;
  return useMemo(() => getLinkProps({ ...props, application }), [application, props]);
};

export const useGetLinkProps: () => GetLinkProps = () => {
  const { application } = useKibana().services;
  return useCallback<GetLinkProps>(
    (props) => getLinkProps({ ...props, application }),
    [application]
  );
};

const getLinkProps = ({
  deepLinkId,
  path,
  onClick: onClickProps,
  appId = APP_UI_ID,
  application,
}: GetLinkPropsParams & { application: Services['application'] }): LinkProps => {
  const { getUrlForApp, navigateToUrl } = application;
  const url = getUrlForApp(appId, { deepLinkId, path });
  return {
    href: url,
    onClick: (ev) => {
      if (isModifiedEvent(ev)) {
        return;
      }

      ev.preventDefault();
      navigateToUrl(url);
      if (onClickProps) {
        onClickProps(ev);
      }
    },
  };
};

const isModifiedEvent = (event: MouseEvent) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
