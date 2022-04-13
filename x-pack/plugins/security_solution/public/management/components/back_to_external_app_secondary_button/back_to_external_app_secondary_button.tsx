/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { CommonProps, EuiButtonEmpty } from '@elastic/eui';

import { ListPageRouteState } from '../../../../common/endpoint/types';

import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';

export type BackToExternalAppSecondaryButtonProps = CommonProps & ListPageRouteState;
export const BackToExternalAppSecondaryButton = memo<BackToExternalAppSecondaryButtonProps>(
  ({ backButtonLabel, backButtonUrl, onBackButtonNavigateTo, ...commonProps }) => {
    const handleBackOnClick = useNavigateToAppEventHandler(...onBackButtonNavigateTo);

    return (
      // eslint-disable-next-line @elastic/eui/href-or-on-click
      <EuiButtonEmpty
        {...commonProps}
        data-test-subj="backToOrigin"
        size="s"
        href={backButtonUrl}
        onClick={handleBackOnClick}
        textProps={{ className: 'text' }}
      >
        {backButtonLabel || (
          <FormattedMessage id="xpack.securitySolution.list.backButton" defaultMessage="Back" />
        )}
      </EuiButtonEmpty>
    );
  }
);

BackToExternalAppSecondaryButton.displayName = 'BackToExternalAppSecondaryButton';
