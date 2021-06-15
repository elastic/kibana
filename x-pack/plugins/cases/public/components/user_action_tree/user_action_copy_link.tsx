/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import copy from 'copy-to-clipboard';

import * as i18n from './translations';

interface UserActionCopyLinkProps {
  id: string;
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
}

const UserActionCopyLinkComponent = ({
  id: commentId,
  getCaseDetailHrefWithCommentId,
}: UserActionCopyLinkProps) => {
  const handleAnchorLink = useCallback(() => {
    copy(getCaseDetailHrefWithCommentId(commentId));
  }, [getCaseDetailHrefWithCommentId, commentId]);

  return (
    <EuiToolTip position="top" content={<p>{i18n.COPY_REFERENCE_LINK}</p>}>
      <EuiButtonIcon
        aria-label={i18n.COPY_REFERENCE_LINK}
        data-test-subj={`copy-link-${commentId}`}
        onClick={handleAnchorLink}
        iconType="link"
        id={`${commentId}-permLink`}
      />
    </EuiToolTip>
  );
};

export const UserActionCopyLink = memo(UserActionCopyLinkComponent);
