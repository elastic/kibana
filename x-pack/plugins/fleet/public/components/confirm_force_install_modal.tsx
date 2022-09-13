/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiCallOut, EuiLink } from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core/public';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import type { PackageInfo } from '../../common';

export const ConfirmForceInstallModal: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
  pkg?: Pick<PackageInfo, 'name' | 'version'>;
  docLinks: DocLinksStart;
}> = ({ onCancel, onConfirm, pkg, docLinks }) => {
  const title =
    pkg && pkg.name && pkg.version
      ? i18n.translate('xpack.fleet.ConfirmForceInstallModal.calloutTitleWithPkg', {
          defaultMessage: 'Integration {pkgName}-{pkgVersion} has failed verification',
          values: {
            pkgName: pkg.name,
            pkgVersion: pkg.version,
          },
        })
      : i18n.translate('xpack.fleet.ConfirmForceInstallModal.calloutTitleNoPkg', {
          defaultMessage: 'The integration has failed verification',
        });
  return (
    <EuiConfirmModal
      title={
        <span className="eui-textBreakWord">
          <FormattedMessage
            id="xpack.fleet.ConfirmForceInstallModal.title"
            defaultMessage="Install unverified integration?"
          />
        </span>
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.ConfirmForceInstallModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.ConfirmForceInstallModal.confirmButtonLabel"
          defaultMessage="Install anyway"
        />
      }
      buttonColor="danger"
      data-test-subj="confirmForceInstallModal"
    >
      <EuiCallOut
        title={title}
        color="warning"
        iconType="alert"
        children={
          <FormattedMessage
            id="xpack.fleet.ConfirmForceInstallModal.calloutBody"
            defaultMessage="This integration contains an unsigned package of unknown authenticity and could contain malicious files. Learn more about {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink target="_blank" external href={docLinks.links.fleet.packageSignatures}>
                  <FormattedMessage
                    id="xpack.fleet.ConfirmForceInstallModal.learnMoreLink"
                    defaultMessage="package signatures"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
    </EuiConfirmModal>
  );
};
