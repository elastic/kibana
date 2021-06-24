/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { isEmpty } from 'lodash';

import * as i18n from './translations';
import { LinkAnchor } from '../links';

interface Props {
  type: string;
  hostId: string;
  hostName: string;
}

const HostIsolationCommentEventComponent: React.FC<Props> = ({ type, hostId, hostName }) => {
  const onLinkClick = useCallback(
    (ev) => {
      ev.preventDefault();
      //  if (onHostDetailsClick) onHostDetailsClick(hostId, ev);
    },
    //  [hostId, onHostDetailsClick]
    []
  );
  // const hostDetailsHref = getHostDetailsHref(hostId);
  const hostDetailsHref = '#todo';

  return (
    <>
      {type === 'isolate' ? `${i18n.ISOLATED_HOST}` : `${i18n.RELEASED_HOST}`}
      {!isEmpty(hostId) && (
        <LinkAnchor
          onClick={onLinkClick}
          href={hostDetailsHref}
          data-test-subj={`endpointDetails-activity-log-link-${hostId ?? 'deleted'}`}
        >
          {hostName}
        </LinkAnchor>
      )}
    </>
  );
};

export const HostIsolationCommentEvent = memo(HostIsolationCommentEventComponent);
