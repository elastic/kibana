/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';
import React, { useCallback } from 'react';

import type { IExternalReferenceMetaDataProps } from './types';
import { getEndpointDetailsPath } from '../../management/common/routing';

import { ISOLATED_HOST, OTHER_ENDPOINTS, RELEASED_HOST } from '../pages/translations';

const AttachmentContent = (props: {
  externalReferenceMetadata: {
    command: IExternalReferenceMetaDataProps['externalReferenceMetadata']['command'];
    targets: IExternalReferenceMetaDataProps['externalReferenceMetadata']['targets'];
  };
}) => {
  const {
    externalReferenceMetadata: { command, targets },
  } = props;

  const { getAppUrl, navigateTo } = useNavigation();

  const endpointDetailsHref = getAppUrl({
    path: getEndpointDetailsPath({
      name: 'endpointActivityLog',
      selected_endpoint: targets[0].endpointId,
    }),
  });
  const hostsDetailsHref = getAppUrl({
    appId: 'security',
    path: `/hosts/name/${targets[0].hostname}`,
  });

  const actionText = command === 'isolate' ? `${ISOLATED_HOST} ` : `${RELEASED_HOST} `;

  const linkHref = targets[0].type === 'sentinel_one' ? hostsDetailsHref : endpointDetailsHref;

  const onLinkClick = useCallback(
    (ev) => {
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
export { AttachmentContent as default };
