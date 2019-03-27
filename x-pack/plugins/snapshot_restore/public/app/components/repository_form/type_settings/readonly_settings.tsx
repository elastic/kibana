/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ReadonlyRepository, Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';

import {
  EuiCode,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  repository: ReadonlyRepository;
  onSettingsChange: (repository: Repository['settings']) => void;
}

export const ReadonlySettings: React.FunctionComponent<Props> = ({
  repository,
  onSettingsChange,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const {
    settings: { url },
  } = repository;

  return (
    <Fragment>
      {/* URL field */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlTitle"
                defaultMessage="URL"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <Fragment>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlDescription"
              defaultMessage="Location of the snapshots. Required."
            />
            <EuiSpacer size="m" />
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlWhitelistDescription"
              defaultMessage="URL repositories with {httpType}, {httpsType}, and {ftpType} must be whitelisted as part of the {settingKey} Elasticsearch setting."
              values={{
                httpType: <EuiCode>http:</EuiCode>,
                httpsType: <EuiCode>https:</EuiCode>,
                ftpType: <EuiCode>ftp:</EuiCode>,
                settingKey: <EuiCode>repositories.url.allowed_urls</EuiCode>,
              }}
            />
            <EuiSpacer size="s" />
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlFilePathDescription"
              defaultMessage="Similarly, URL repositories with {fileType} URLs can only point to locations registered in the {settingKey} setting."
              values={{
                fileType: <EuiCode>file:</EuiCode>,
                settingKey: <EuiCode>path.repo</EuiCode>,
              }}
            />
          </Fragment>
        }
        idAria="fsRepositoryURLDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlLabel"
              defaultMessage="URL"
            />
          }
          fullWidth
          describedByIds={['fsRepositoryURLDescription']}
        >
          <EuiFieldText
            defaultValue={url || ''}
            fullWidth
            onChange={e => {
              onSettingsChange({
                ...repository.settings,
                url: e.target.value,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
