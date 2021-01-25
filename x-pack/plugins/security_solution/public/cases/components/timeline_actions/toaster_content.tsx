/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import * as i18n from './translations';

interface Props {
  caseId: string;
  syncAlerts: boolean;
  onViewCaseClick: (id: string) => void;
}

const ToasterContentComponent: React.FC<Props> = ({ caseId, syncAlerts, onViewCaseClick }) => {
  const onClick = useCallback(() => onViewCaseClick(caseId), [caseId, onViewCaseClick]);
  return (
    <>
      {syncAlerts && <div>{i18n.CASE_CREATED_SUCCESS_TOAST_TEXT}</div>}
      <EuiButtonEmpty size="s" flush="left" onClick={onClick}>
        {i18n.VIEW_CASE}
      </EuiButtonEmpty>
    </>
  );
};

export const ToasterContent = memo(ToasterContentComponent);
