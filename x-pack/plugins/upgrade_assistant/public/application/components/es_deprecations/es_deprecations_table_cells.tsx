/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiLink } from '@elastic/eui';
import { EnrichedDeprecationInfo } from '../../../../common/types';
import { DEPRECATION_TYPE_MAP } from '../constants';
import { DeprecationTableColumns } from '../types';

interface Props {
  statusTableCell?: React.ReactNode;
  fieldName: DeprecationTableColumns;
  deprecation: EnrichedDeprecationInfo;
  openFlyout: () => void;
}

const i18nTexts = {
  criticalBadgeLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.defaultDeprecation.criticalBadgeLabel',
    {
      defaultMessage: 'Critical',
    }
  ),
};

export const EsDeprecationsTableCells: React.FunctionComponent<Props> = ({
  statusTableCell,
  fieldName,
  deprecation,
  openFlyout,
}) => {
  // "Type" column
  if (fieldName === 'type') {
    return <>{DEPRECATION_TYPE_MAP[deprecation.type as EnrichedDeprecationInfo['type']]}</>;
  }

  // "Status column"
  if (fieldName === 'correctiveAction') {
    if (statusTableCell) {
      return <>{statusTableCell}</>;
    } else if (deprecation.isCritical === true) {
      return <EuiBadge color="danger">{i18nTexts.criticalBadgeLabel}</EuiBadge>;
    }

    return <>{''}</>;
  }

  // "Issue" column
  if (fieldName === 'message') {
    return (
      <EuiLink data-test-subj="deprecationMessageLink" onClick={openFlyout}>
        {deprecation.message}
      </EuiLink>
    );
  }

  // Default behavior: render value or empty string if undefined
  return <>{deprecation[fieldName] ?? ''}</>;
};
