/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import copy from 'copy-to-clipboard';

import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';
import { SecurityPageName } from '../../../app/types';
import { navTabs } from '../../../app/home/home_navigations';
import * as i18n from './translations';

interface UserActionCopyLinkProps {
  id: string;
}

const UserActionCopyLinkComponent = ({ id }: UserActionCopyLinkProps) => {
  const { detailName: caseId } = useParams();
  const urlSearch = useGetUrlSearch(navTabs.case);

  const handleAnchorLink = useCallback(() => {
    copy(
      `${window.location.origin}${window.location.pathname}#${SecurityPageName.case}/${caseId}/${id}${urlSearch}`
    );
  }, [caseId, id, urlSearch]);

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
