/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { LogEntryColumnContent } from './log_entry_column';
import { euiStyled } from '../../../../../observability/public';

interface LogEntryActionsColumnProps {
  isHovered: boolean;
  openFlyout: () => void;
}

export const LogEntryActionsColumn: React.FC<LogEntryActionsColumnProps> = ({
  isHovered,
  openFlyout,
}) => {
  const label = i18n.translate('xpack.infra.logEntryItemView.viewDetailsToolTip', {
    defaultMessage: 'View Details',
  });

  return (
    <ActionsColumnContent>
      {isHovered ? (
        <AbsoluteWrapper>
          <EuiButtonIcon onClick={openFlyout} iconType="expand" title={label} aria-label={label} />
        </AbsoluteWrapper>
      ) : null}
    </ActionsColumnContent>
  );
};

const ActionsColumnContent = euiStyled(LogEntryColumnContent)`
  overflow: hidden;
  user-select: none;
`;

// this prevents the button from influencing the line height
const AbsoluteWrapper = euiStyled.div`
  overflow: hidden;
  position: absolute;
`;
