/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTitle, EuiLink, EuiText, EuiSpacer, EuiBasicTable, EuiButtonEmpty } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useLink, useStartServices } from '../../../../hooks';

export interface SettingsSectionProps {
  fleetServerHosts: string[];
}

export const SettingsSection: React.FunctionComponent<SettingsSectionProps> = ({
  fleetServerHosts,
}) => {
  const { docLinks } = useStartServices();
  const { getHref } = useLink();

  const columns = useMemo((): Array<EuiBasicTableColumn<string>> => {
    return [
      {
        render: (host: string) => host,
        name: i18n.translate('xpack.fleet.settings.fleetServerHostUrlColumnTitle', {
          defaultMessage: 'Host URL',
        }),
      },
    ];
  }, []);

  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostSectionTitle"
            defaultMessage="Fleet server hosts"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText color="subdued" size="m">
        <FormattedMessage
          id="xpack.fleet.settings.fleetServerHostSectionSubtitle"
          defaultMessage="Specify the URLs that your agents will use to connect to a Fleet Server. If multiple URLs exist, Fleet will show the first provided URL for enrollment purposes. For more information, see the {guideLink} ."
          values={{
            guideLink: (
              <EuiLink href={docLinks.links.fleet.guide} target="_blank" external>
                <FormattedMessage
                  id="xpack.fleet.settings.fleetUserGuideLink"
                  defaultMessage="Fleet User Guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiBasicTable columns={columns} items={fleetServerHosts} />
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="pencil"
        href={getHref('settings_edit_fleet_server_hosts')}
        data-test-subj="editHostsBtn"
      >
        <FormattedMessage
          id="xpack.fleet.settings.fleetServerHostEditButtonLabel"
          defaultMessage="Edit hosts"
        />
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
    </>
  );
};
