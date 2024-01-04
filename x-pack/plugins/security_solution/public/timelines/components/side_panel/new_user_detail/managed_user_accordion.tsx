/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiFontSize } from '@elastic/eui';

import React from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash/fp';
import { UserDetailsLeftPanelTab } from '../../../../flyout/entity_details/user_details_left/tabs';
import { ExpandablePanel } from '../../../../flyout/shared/components/expandable_panel';
import type { ManagedUserFields } from '../../../../../common/search_strategy/security_solution/users/managed_details';

import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { ONE_WEEK_IN_HOURS } from './constants';
import { UserAssetTableType } from '../../../../explore/users/store/model';
interface ManagedUserAccordionProps {
  children: React.ReactNode;
  title: string;
  managedUser: ManagedUserFields;
  tableType: UserAssetTableType;
  openDetailsPanel: (tab: UserDetailsLeftPanelTab) => void;
}

export const ManagedUserAccordion: React.FC<ManagedUserAccordionProps> = ({
  children,
  title,
  managedUser,
  tableType,
  openDetailsPanel,
}) => {
  const xsFontSize = useEuiFontSize('xxs').fontSize;
  const timestamp = get('@timestamp[0]', managedUser) as unknown as string | undefined;

  return (
    <ExpandablePanel
      header={{
        title,
        iconType: 'arrowStart',
        headerContent: timestamp && (
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
                    value={timestamp}
                    dateFormat="MMM D, YYYY"
                    relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                  />
                ),
              }}
            />
          </span>
        ),
        link: {
          callback: () =>
            openDetailsPanel(
              tableType === UserAssetTableType.assetOkta
                ? UserDetailsLeftPanelTab.OKTA
                : UserDetailsLeftPanelTab.ENTRA
            ),
          tooltip: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.showAssetDocument"
              defaultMessage="Show asset details"
            />
          ),
        },
      }}
      expand={{ expandable: false }}
    >
      {children}
    </ExpandablePanel>
  );
};
