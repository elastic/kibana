/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { NotificationsList } from './components/notifications_list';
import { ML_NOTIFICATIONS_LAST_CHECKED_AT } from '../../../common/types/storage';
import { useMlKibana, useTimefilter } from '../contexts/kibana';
import { MlPageHeader } from '../components/page_header';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useStorage } from '../contexts/ml/use_storage';

export const NotificationsPage: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  const [, setNotificationLastCheckedAt] = useStorage(ML_NOTIFICATIONS_LAST_CHECKED_AT);

  useEffect(function updateLastChecked() {
    setNotificationLastCheckedAt(Date.now());
    return () => {
      setNotificationLastCheckedAt(Date.now());
    };
  }, []);

  useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  return (
    <div>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.notifications.notificationsLabel"
          defaultMessage="Notifications"
        />
      </MlPageHeader>

      <NodeAvailableWarning />
      <UpgradeWarning />

      <NotificationsList />

      <HelpMenu docLink={helpLink} />
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default NotificationsPage;
