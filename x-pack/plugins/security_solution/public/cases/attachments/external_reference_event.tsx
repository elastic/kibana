/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';
import React, { useCallback, useMemo } from 'react';

import { ISOLATED_HOST, RELEASED_HOST, OTHER_ENDPOINTS } from '../pages/translations';
import type { IExternalReferenceMetaDataProps } from './types';
import { getEndpointDetailsPath } from '../../management/common/routing';

const AttachmentContentEvent = ({
  externalReferenceMetadata: { command, targets },
}: IExternalReferenceMetaDataProps) => {
  const { getAppUrl, navigateTo } = useNavigation();

  const endpointDetailsHref = getAppUrl({
    path: getEndpointDetailsPath({
      name: 'endpointActivityLog',
      selected_endpoint: targets[0].endpointId,
    }),
  });
  const hostsDetailsHref = getAppUrl({
    path: `/hosts/name/${targets[0].hostname}`,
  });

  const actionText = useMemo(() => {
    return command === 'isolate' ? `${ISOLATED_HOST} ` : `${RELEASED_HOST} `;
  }, [command]);

  const linkHref = useMemo(
    () => (targets[0].agentType === 'endpoint' ? endpointDetailsHref : hostsDetailsHref),
    [endpointDetailsHref, hostsDetailsHref, targets]
  );

  const onLinkClick = useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      ev.preventDefault();
      return navigateTo({ url: linkHref });
    },
    [navigateTo, linkHref]
  );

  return (
    <>
      {actionText}
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiLink
        onClick={onLinkClick}
        href={linkHref}
        data-test-subj={`actions-link-${targets[0].endpointId}`}
      >
        {targets[0].hostname}
      </EuiLink>
      {targets.length > 1 && OTHER_ENDPOINTS(targets.length - 1)}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContentEvent as default };
