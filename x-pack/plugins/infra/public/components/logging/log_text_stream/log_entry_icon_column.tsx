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

interface LogEntryDetailsIconColumnProps {
  isHovered: boolean;
  openFlyout: () => void;
}

export const LogEntryDetailsIconColumn: React.FC<LogEntryDetailsIconColumnProps> = ({
  isHovered,
  openFlyout,
}) => {
  const label = i18n.translate('xpack.infra.logEntryItemView.viewDetailsToolTip', {
    defaultMessage: 'View Details',
  });

  return (
    <IconColumnContent>
      {isHovered ? (
        <AbsoluteIconButtonWrapper>
          <EuiButtonIcon onClick={openFlyout} iconType="expand" title={label} aria-label={label} />
        </AbsoluteIconButtonWrapper>
      ) : null}
    </IconColumnContent>
  );
};

const IconColumnContent = euiStyled(LogEntryColumnContent)`
  overflow: hidden;
  user-select: none;
`;

// this prevents the button from influencing the line height
const AbsoluteIconButtonWrapper = euiStyled.div`
  overflow: hidden;
  position: absolute;
`;
