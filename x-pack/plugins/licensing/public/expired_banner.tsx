/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';

import { toMountPoint } from '@kbn/react-kibana-mount';

interface Props {
  type: string;
  uploadUrl: string;
}

const ExpiredBanner: React.FunctionComponent<Props> = (props) => (
  <EuiCallOut
    iconType="help"
    color="warning"
    data-test-subj="licenseExpiredBanner"
    title={
      <FormattedMessage
        id="xpack.licensing.welcomeBanner.licenseIsExpiredTitle"
        defaultMessage="Your {licenseType} license is expired"
        values={{ licenseType: props.type }}
      />
    }
  >
    <FormattedMessage
      id="xpack.licensing.welcomeBanner.licenseIsExpiredDescription"
      defaultMessage="Contact your administrator or {updateYourLicenseLinkText} directly."
      values={{
        updateYourLicenseLinkText: (
          <a href={props.uploadUrl}>
            <FormattedMessage
              id="xpack.licensing.welcomeBanner.licenseIsExpiredDescription.updateYourLicenseLinkText"
              defaultMessage="update your license"
            />
          </a>
        ),
      }}
    />
  </EuiCallOut>
);

type MountProps = Props & Pick<CoreStart, 'analytics' | 'i18n' | 'theme'>;

export const mountExpiredBanner = ({ type, uploadUrl, ...startServices }: MountProps) =>
  toMountPoint(<ExpiredBanner type={type!} uploadUrl={uploadUrl} />, startServices);
