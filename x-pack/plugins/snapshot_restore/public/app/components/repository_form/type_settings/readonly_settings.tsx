/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormHelpText,
  EuiFormRow,
  EuiSelect,
  EuiTitle,
} from '@elastic/eui';
import { ReadonlyRepository, Repository } from '../../../../../common/types';
import { useAppDependencies } from '../../../index';
import { RepositorySettingsValidation } from '../../../services/validation';

interface Props {
  repository: ReadonlyRepository;
  updateRepositorySettings: (
    updatedSettings: Partial<Repository['settings']>,
    replaceSettings?: boolean
  ) => void;
  settingErrors: RepositorySettingsValidation;
}

export const ReadonlySettings: React.FunctionComponent<Props> = ({
  repository,
  updateRepositorySettings,
  settingErrors,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const {
    settings: { url },
  } = repository;
  const hasErrors: boolean = Boolean(Object.keys(settingErrors).length);

  function getSchemeHelpText(scheme: string): React.ReactNode {
    switch (scheme) {
      case 'http':
      case 'https':
      case 'ftp':
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlWhitelistDescription"
            defaultMessage="URL repositories with the {scheme} scheme must be whitelisted as part of the {settingKey} Elasticsearch setting."
            values={{
              scheme: <EuiCode>{scheme}</EuiCode>,
              settingKey: <EuiCode>repositories.url.allowed_urls</EuiCode>,
            }}
          />
        );
      case 'file':
        return (
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlFilePathDescription"
            defaultMessage="URL repositories with the {scheme} scheme can only point to locations registered in the {settingKey} setting."
            values={{
              scheme: <EuiCode>file</EuiCode>,
              settingKey: <EuiCode>path.repo</EuiCode>,
            }}
          />
        );
      default:
        return null;
    }
  }

  const schemeOptions = [
    {
      value: 'http',
      text: 'http://',
    },
    {
      value: 'https',
      text: 'https://',
    },
    {
      value: 'ftp',
      text: 'ftp://',
    },
    {
      value: 'file',
      text: 'file://',
    },
  ];

  const [selectedScheme, selectScheme] = useState(url ? url.split('://')[0] : 'http');

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
          </Fragment>
        }
        idAria="readonlyRepositoryUrlDescription"
        fullWidth
      >
        <div>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlSchemeLabel"
                    defaultMessage="Scheme"
                  />
                }
                fullWidth
                describedByIds={['readonlyRepositoryUrlDescription']}
              >
                <EuiSelect
                  options={schemeOptions}
                  value={selectedScheme}
                  onChange={e => selectScheme(e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.snapshotRestore.repositoryForm.typeReadonly.urlLabel"
                    defaultMessage="Path"
                  />
                }
                fullWidth
                describedByIds={['readonlyRepositoryUrlDescription']}
                isInvalid={Boolean(hasErrors && settingErrors.url)}
                error={settingErrors.url}
              >
                <EuiFieldText
                  defaultValue={url ? url.split('://')[1] : ''}
                  fullWidth
                  onChange={e => {
                    updateRepositorySettings({
                      url: `${selectedScheme}://${e.target.value}`,
                    });
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFormHelpText>{getSchemeHelpText(selectedScheme)}</EuiFormHelpText>
        </div>
      </EuiDescribedFormGroup>
    </Fragment>
  );
};
