/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import {
  EuiCallOut,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiListGroup,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { EuiListGroupItemProps } from '@elastic/eui/src/components/list_group/list_group_item';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { UptimeSettingsContext } from '../../../../contexts';
import { Rule } from '../../../../../../triggers_actions_ui/public';
import { getUrlForAlert } from '../../../../lib/alert_types/common';

interface Props {
  monitorAlerts: Rule[];
  loading: boolean;
}

const LinkGroupList = styled(EuiListGroup)`
  &&& {
    a {
      padding-left: 0;
      padding-top: 0;
    }
  }
`;

export const EnabledAlerts = ({ monitorAlerts, loading }: Props) => {
  const { basePath } = useContext(UptimeSettingsContext);

  const listItems: EuiListGroupItemProps[] = [];

  (monitorAlerts ?? []).forEach((alert, ind) => {
    listItems.push({
      size: 's',
      label: alert.name,
      href: getUrlForAlert(alert.id, basePath),
      'data-test-subj': 'uptimeMonitorListDrawerAlert' + ind,
    });
  });

  return (
    <EuiDescriptionList>
      <EuiDescriptionListTitle>
        {i18n.translate('xpack.uptime.monitorList.enabledAlerts.title', {
          defaultMessage: 'Enabled rules',
          description: 'Rules enabled for this monitor',
        })}
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {listItems.length === 0 && !loading && (
          <EuiCallOut
            size="s"
            title={i18n.translate('xpack.uptime.monitorList.enabledAlerts.noAlert', {
              defaultMessage: 'No rules are enabled for this monitor.',
            })}
          />
        )}
        {loading ? <EuiLoadingSpinner /> : <LinkGroupList listItems={listItems} flush={true} />}
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
};
