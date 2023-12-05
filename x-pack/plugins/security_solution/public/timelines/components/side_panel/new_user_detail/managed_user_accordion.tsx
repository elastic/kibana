/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiFontSize } from '@elastic/eui';

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash/fp';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { ExpandablePanel } from '../../../../flyout/shared/components/expandable_panel';
import type { ManagedUserFields } from '../../../../../common/search_strategy/security_solution/users/managed_details';

import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { ONE_WEEK_IN_HOURS } from './constants';
import { AssetDocumentLeftPanelKey } from '../../../../flyout/entity_details/asset_document_left';
import type { UserAssetTableType } from '../../../../explore/users/store/model';
interface ManagedUserAccordionProps {
  children: React.ReactNode;
  title: string;
  managedUser: ManagedUserFields;
  indexName: string;
  eventId: string;
  tableType: UserAssetTableType;
}

export const ManagedUserAccordion: React.FC<ManagedUserAccordionProps> = ({
  children,
  title,
  managedUser,
  indexName,
  eventId,
  tableType,
}) => {
  const xsFontSize = useEuiFontSize('xxs').fontSize;
  const timestamp = get('@timestamp[0]', managedUser) as unknown as string | undefined;

  const { openLeftPanel } = useExpandableFlyoutContext();
  const toggleDetails = useCallback(() => {
    openLeftPanel({
      id: AssetDocumentLeftPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId: tableType,
      },
    });
  }, [openLeftPanel, eventId, indexName, tableType]);

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
          callback: toggleDetails,
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
