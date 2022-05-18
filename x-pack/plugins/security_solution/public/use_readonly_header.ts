/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import * as i18n from './translations';
import { useKibana } from './common/lib/kibana';
import { useAlertsPrivileges } from './detections/containers/detection_engine/alerts/use_alerts_privileges';

/**
 * This component places a read-only icon badge in the header
 * if user only has read *Kibana* privileges, not individual data index
 * privileges
 */
export function useReadonlyHeader(tooltip: string) {
  const { hasKibanaREAD, hasKibanaCRUD } = useAlertsPrivileges();
  const chrome = useKibana().services.chrome;

  useEffect(() => {
    if (hasKibanaREAD && !hasKibanaCRUD) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip,
        iconType: 'glasses',
      });
    }

    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [chrome, hasKibanaREAD, hasKibanaCRUD, tooltip]);
}
