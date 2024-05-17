/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';

import { useKibana } from '../../common/lib/kibana';
import { isReadOnlyPermissions } from '../../utils/permissions';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';

/**
 * This component places a read-only icon badge in the header if user only has read permissions
 */
export function useReadonlyHeader() {
  const { permissions } = useCasesContext();
  const chrome = useKibana().services.chrome;

  // if the user is read only then display the glasses badge in the global navigation header
  const setBadge = useCallback(() => {
    if (isReadOnlyPermissions(permissions)) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
        iconType: 'glasses',
      });
    }
  }, [chrome, permissions]);

  useEffect(() => {
    setBadge();

    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [setBadge, chrome]);
}
