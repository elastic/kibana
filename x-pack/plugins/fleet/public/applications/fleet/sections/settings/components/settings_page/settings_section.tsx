/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiTitle,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { Settings } from '../../../../types';
import { useLink, useStartServices } from '../../../../hooks';

export interface SettingsSectionProps {
  settings: Settings;
}

export const SettingsSection: React.FunctionComponent<SettingsSectionProps> = ({ settings }) => {
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

  const isEditDisabled = settings.preconfigured_fields?.includes('fleet_server_hosts') ?? false;
  const BtnWrapper = useMemo((): React.FunctionComponent => {
    if (!isEditDisabled) {
      return ({ children }) => <>{children}</>;
    }

    return ({ children }) => (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostsPreconfiguredTooltipContent"
            defaultMessage="Fleet Server hosts are configured outside of Fleet. Refer to your kibana config for more details."
          />
        }
      >
        <>{children}</>
      </EuiToolTip>
    );
  }, [isEditDisabled]);

  return (
    <>
      <EuiTitle size="s">
        <h4 data-test-subj="fleetServerHostHeader">
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
                  defaultMessage="Fleet and Elastic Agent Guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiBasicTable columns={columns} items={settings.fleet_server_hosts} />
      <EuiSpacer size="s" />
      <BtnWrapper>
        <EuiButtonEmpty
          iconType="pencil"
          href={getHref('settings_edit_fleet_server_hosts')}
          data-test-subj="editHostsBtn"
          disabled={isEditDisabled}
        >
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostEditButtonLabel"
            defaultMessage="Edit hosts"
          />
        </EuiButtonEmpty>
      </BtnWrapper>
      <EuiSpacer size="m" />
    </>
  );
};
