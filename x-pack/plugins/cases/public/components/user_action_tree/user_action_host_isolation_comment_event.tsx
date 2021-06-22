/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { EuiLoadingSpinner } from '@elastic/eui';

import * as i18n from './translations';
import { CommentType } from '../../../common';
import { LinkAnchor } from '../links';
import { RuleDetailsNavigation } from './helpers';

interface Props {
  commentType: CommentType;
  getHostDetailsHref: RuleDetailsNavigation['href'];
  onHostDetailsClick?: RuleDetailsNavigation['onClick'];
  hostId?: string | null;
  hostName?: string | null;
  loadingAlertData?: boolean;
}

const HostIsolationCommentEventComponent: React.FC<Props> = ({
  commentType,
  getHostDetailsHref,
  onHostDetailsClick,
  hostId,
  hostName,
  loadingAlertData = false,
}) => {
  const onLinkClick = useCallback(
    (ev) => {
      ev.preventDefault();
      if (onHostDetailsClick) onHostDetailsClick(hostId, ev);
    },
    [hostId, onHostDetailsClick]
  );
  const hostDetailsHref = getHostDetailsHref(hostId);

  return (
    commentType !== CommentType.generatedAlert && (
      <>
        {`${i18n.ISOLATED_HOST} `}
        {loadingAlertData && <EuiLoadingSpinner size="m" />}
        {!loadingAlertData && !isEmpty(hostId) && (
          <LinkAnchor
            onClick={onLinkClick}
            href={hostDetailsHref}
            data-test-subj={`host_isolation-link-${hostId ?? 'deleted'}`}
          >
            {hostName ?? i18n.UNKNOWN_RULE}
          </LinkAnchor>
        )}
        {!loadingAlertData && isEmpty(hostId) && i18n.UNKNOWN_RULE}
      </>
    )
  );
};

export const HostIsolationCommentEvent = memo(HostIsolationCommentEventComponent);
