/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

const UserActionCopyLinkComponent = ({ id }: UserActionCopyLinkProps) => {
  const { detailName: caseId } = useParams<{ detailName: string }>();
  const { formatUrl } = useFormatUrl(SecurityPageName.case);

  const handleAnchorLink = useCallback(() => {
    copy(
      formatUrl(getCaseDetailsUrlWithCommentId({ id: caseId, commentId: id }), { absolute: true })
    );
  }, [caseId, formatUrl, id]);

  return (
    <EuiToolTip position="top" content={<p>{i18n.COPY_REFERENCE_LINK}</p>}>
      <EuiButtonIcon
        aria-label={i18n.COPY_REFERENCE_LINK}
        data-test-subj={`copy-link-${id}`}
        onClick={handleAnchorLink}
        iconType="link"
        id={`${id}-permLink`}
      />
    </EuiToolTip>
  );
};

export const UserActionCopyLink = memo(UserActionCopyLinkComponent);
