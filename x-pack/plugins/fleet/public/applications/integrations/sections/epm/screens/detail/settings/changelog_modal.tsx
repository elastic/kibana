/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiButton,
  EuiSkeletonText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useGetFileByPathQuery, useStartServices } from '../../../../../hooks';

interface Props {
  title?: string;
  changelogPath: string;
  onClose: () => void;
}

export const ChangelogModal: React.FunctionComponent<Props> = ({
  title = 'Changelog',
  changelogPath,
  onClose,
}) => {
  const { notifications } = useStartServices();

  const {
    data: changelogResponse,
    error: changelogError,
    isLoading,
  } = useGetFileByPathQuery(changelogPath);
  const changelogText = changelogResponse?.data;

  if (changelogError) {
    notifications.toasts.addError(changelogError, {
      title: i18n.translate('xpack.fleet.epm.errorLoadingChangelog', {
        defaultMessage: 'Error loading changelog information',
      }),
    });
  }

  return (
    <EuiModal maxWidth={true} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSkeletonText
          lines={10}
          size="s"
          isLoading={isLoading}
          contentAriaLabel="changelog text"
        >
          <EuiCodeBlock overflowHeight={360}>{changelogText}</EuiCodeBlock>
        </EuiSkeletonText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton color="primary" fill onClick={onClose}>
          <FormattedMessage id="xpack.fleet.epm.changelogModalCloseBtn" defaultMessage="Close" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
