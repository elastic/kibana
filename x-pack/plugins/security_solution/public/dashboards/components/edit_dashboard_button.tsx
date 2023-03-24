/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { Query, Filter } from '@kbn/es-query';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useDashboardAppLink } from '../hooks/use_dashboard_app_link';
import {
  EDIT_DASHBOARD_BUTTON_TITLE,
  RESTORE_URL_ERROR_TITLE,
  SAVE_STATE_IN_URL_ERROR_TITLE,
} from '../pages/details/translations';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { LinkButton } from '../../common/components/links';

export interface EditDashboardButtonComponentProps {
  dashboardExists: boolean;
  filters?: Filter[];
  query?: Query;
  savedObjectId: string | undefined;
  showWriteControls: boolean;
  timeRange: {
    from: string;
    to: string;
    fromStr?: string | undefined;
    toStr?: string | undefined;
  };
}

const EditDashboardButtonComponent: React.FC<EditDashboardButtonComponentProps> = ({
  dashboardExists,
  filters,
  query,
  savedObjectId,
  showWriteControls,
  timeRange,
}) => {
  const history = useHistory();
  const {
    services: { uiSettings },
  } = useKibana();

  const toasts = useAppToasts();
  const kbnUrlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        onGetError: (error: Error) => {
          toasts.addError(error, {
            title: RESTORE_URL_ERROR_TITLE,
          });
        },
        onSetError: (error: Error) => {
          toasts.addError(error, {
            title: SAVE_STATE_IN_URL_ERROR_TITLE,
          });
        },
      }),
    [toasts, history, uiSettings]
  );

  const editDashboardUrl = useDashboardAppLink({
    query,
    filters,
    timeRange,
    uiSettings,
    savedObjectId,
    kbnUrlStateStorage,
  });

  return showWriteControls && dashboardExists ? (
    <LinkButton
      color="primary"
      fill
      iconType="pencil"
      href={editDashboardUrl}
      data-test-subj="dashboardEditButton"
    >
      {EDIT_DASHBOARD_BUTTON_TITLE}
    </LinkButton>
  ) : null;
};

EditDashboardButtonComponent.displayName = 'EditDashboardComponent';
export const EditDashboardButton = React.memo(EditDashboardButtonComponent);
