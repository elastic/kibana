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

export const ConfirmOpenUnverifiedModal: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
  pkgName: string;
  docLinks: DocLinksStart;
}> = ({ onCancel, onConfirm, pkgName, docLinks }) => {
  return (
    <EuiConfirmModal
      title={
        <span className="eui-textBreakWord">
          <FormattedMessage
            id="xpack.fleet.ConfirmOpenUnverifiedModal.title"
            defaultMessage="View unverified integration?"
          />
        </span>
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.ConfirmOpenUnverifiedModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.ConfirmOpenUnverifiedModal.confirmButtonLabel"
          defaultMessage="View anyway"
        />
      }
      buttonColor="danger"
      data-test-subj="ConfirmOpenUnverifiedModal"
    >
      <EuiCallOut
        title={i18n.translate('xpack.fleet.ConfirmOpenUnverifiedModal.calloutTitleWithPkg', {
          defaultMessage: 'Integration {pkgName} has failed verification',
          values: {
            pkgName,
          },
        })}
        color="warning"
        iconType="alert"
        children={
          <FormattedMessage
            id="xpack.fleet.ConfirmOpenUnverifiedModal.calloutBody"
            defaultMessage="This integration contains an unsigned package of unknown authenticity and could contain malicious files. Learn more about {learnMoreLink}."
            values={{
              learnMoreLink: (
                <EuiLink target="_blank" external href={docLinks.links.fleet.packageSignatures}>
                  <FormattedMessage
                    id="xpack.fleet.ConfirmOpenUnverifiedModal.learnMoreLink"
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
