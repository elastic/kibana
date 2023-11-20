/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, useEuiTheme, useEuiFontSize } from '@elastic/eui';

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  EntraManagedUser,
  OktaManagedUser,
} from '../../../../../common/search_strategy/security_solution/users/managed_details';

import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { ONE_WEEK_IN_HOURS } from './constants';
interface ManagedUserAccordionProps {
  children: React.ReactNode;
  openTitle: string;
  closedTitle: string;
  id: string;
  managedUser: EntraManagedUser | OktaManagedUser;
}

export const ManagedUserAccordion: React.FC<ManagedUserAccordionProps> = ({
  children,
  openTitle,
  closedTitle,
  id,
  managedUser,
}) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xxs').fontSize;
  const [isManagedUserToggleOpen, setManagedUserToggleOpen] = useState(true);
  const onToggleManagedUser = useCallback(() => {
    setManagedUserToggleOpen((isOpen) => !isOpen);
  }, [setManagedUserToggleOpen]);

  return (
    <EuiAccordion
      initialIsOpen={isManagedUserToggleOpen}
      id={id}
      data-test-subj={id}
      buttonContent={isManagedUserToggleOpen ? openTitle : closedTitle}
      onToggle={onToggleManagedUser}
      buttonProps={{
        css: css`
          color: ${euiTheme.colors.primary};
        `,
      }}
      extraAction={
        managedUser['@timestamp'] && (
          <span
            css={css`
              font-size: ${xsFontSize};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.timeline.userDetails.updatedTime"
              defaultMessage="Updated {time}"
              values={{
                time: (
                  <FormattedRelativePreferenceDate
                    value={managedUser['@timestamp']}
                    dateFormat="MMM D, YYYY"
                    relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                  />
                ),
              }}
            />
          </span>
        )
      }
    >
      {children}
    </EuiAccordion>
  );
};
