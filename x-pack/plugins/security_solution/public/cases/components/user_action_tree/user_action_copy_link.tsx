/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import copy from 'copy-to-clipboard';

import { useFormatUrl, getCaseDetailsUrlWithCommentId } from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';
import * as i18n from './translations';

interface UserActionCopyLinkProps {
  id: string;
}

const UserActionCopyLinkComponent = ({ id: commentId }: UserActionCopyLinkProps) => {
  const { detailName: caseId, subCaseId } = useParams<{ detailName: string; subCaseId?: string }>();
  const { formatUrl } = useFormatUrl(SecurityPageName.case);

  const handleAnchorLink = useCallback(() => {
    copy(
      formatUrl(getCaseDetailsUrlWithCommentId({ id: caseId, commentId, subCaseId }), {
        absolute: true,
      })
    );
  }, [caseId, commentId, formatUrl, subCaseId]);

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
