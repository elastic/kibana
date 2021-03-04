/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React, { FunctionComponent, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiComboBoxOptionOption,
  EuiTextColor,
  EuiSpacer,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';

import {
  ComboBoxField,
  useKibana,
  useFormData,
  SelectField,
} from '../../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../../edit_policy_context';
import { useConfigurationIssues, UseField, searchableSnapshotFields } from '../../../../form';
import { FieldLoadingError, DescribedFormRow, LearnMoreLink, MoreLessSection } from '../../../';
import { SearchableSnapshotDataProvider } from './searchable_snapshot_data_provider';

import './_searchable_snapshot_field.scss';

export interface Props {
  phase: 'hot' | 'cold' | 'frozen';
}

/**
 * This repository is provisioned by Elastic Cloud and will always
 * exist as a "managed" repository.
 */
const CLOUD_DEFAULT_REPO = 'found-snapshots';

const storageOptions = [
  {
    value: 'full_copy',
    text: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotStorage.fullCopyLabel',
      {
        defaultMessage: 'Full copy',
      }
    ),
  },
  {
    value: 'shared_cache',
    text: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotStorage.sharedCacheLabel',
      {
        defaultMessage: 'Shared cache',
      }
    ),
  },
];

export const SearchableSnapshotField: FunctionComponent<Props> = ({ phase }) => {
  const {
    services: { cloud },
  } = useKibana();
  const { getUrlForApp, policy, license, isNewPolicy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase } = useConfigurationIssues();

  const searchableSnapshotRepoPath = `phases.${phase}.actions.searchable_snapshot.snapshot_repository`;
  const searchableSnapshotStoragePath = `phases.${phase}.actions.searchable_snapshot.storage`;

  const [formData] = useFormData({ watch: searchableSnapshotRepoPath });
  const searchableSnapshotRepo = get(formData, searchableSnapshotRepoPath);

  const isHotPhase = phase === 'hot';
  const isColdPhase = phase === 'cold';
  const isFrozenPhase = phase === 'frozen';
  const isColdOrFrozenPhase = isColdPhase || isFrozenPhase;
  const isDisabledDueToLicense = !license.canUseSearchableSnapshot();

  const [isFieldToggleChecked, setIsFieldToggleChecked] = useState(() =>
    Boolean(
      // New policy on cloud should have searchable snapshot on in cold phase
      (isColdOrFrozenPhase && isNewPolicy && cloud?.isCloudEnabled) ||
        policy.phases[phase]?.actions?.searchable_snapshot?.snapshot_repository
    )
  );

  useEffect(() => {
    if (isDisabledDueToLicense) {
      setIsFieldToggleChecked(false);
    }
  }, [isDisabledDueToLicense]);

  const renderField = () => (
    <SearchableSnapshotDataProvider>
      {({ error, isLoading, resendRequest, data }) => {
        const repos = data?.repositories ?? [];

        let calloutContent: React.ReactNode | undefined;

        if (!isLoading) {
          if (error) {
            calloutContent = (
              <FieldLoadingError
                resendRequest={resendRequest}
                data-test-subj="repositoriesErrorCallout"
                aria-label={i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.reloadSnapshotRepositoriesLabel',
                  {
                    defaultMessage: 'Reload snapshot repositories',
                  }
                )}
                title={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.loadSnapshotRepositoriesErrorTitle"
                    defaultMessage="Unable to load snapshot repositories"
                  />
                }
                body={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.loadSnapshotRepositoriesErrorBody"
                    defaultMessage="Refresh this field and enter the name of an existing snapshot repository."
                  />
                }
              />
            );
          } else if (repos.length === 0) {
            calloutContent = (
              <EuiCallOut
                color="warning"
                title={i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.noSnapshotRepositoriesTitle',
                  { defaultMessage: 'No snapshot repositories found' }
                )}
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.noSnapshotRepositoriesFoundBody"
                  defaultMessage="{link} to use searchable snapshots."
                  values={{
                    link: (
                      <EuiLink
                        href={getUrlForApp('management', {
                          path: `data/snapshot_restore/add_repository`,
                        })}
                        target="_blank"
                      >
                        {i18n.translate(
                          'xpack.indexLifecycleMgmt.editPolicy.createSearchableSnapshotLink',
                          {
                            defaultMessage: 'Create a snapshot repository',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiCallOut>
            );
          } else if (searchableSnapshotRepo && !repos.includes(searchableSnapshotRepo)) {
            calloutContent = (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.noSnapshotRepositoriesWithNameTitle',
                  { defaultMessage: 'Repository name not found' }
                )}
                color="warning"
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.noSnapshotRepositoryWithNameBody"
                  defaultMessage="Enter the name of an existing repository, or {link} with this name."
                  values={{
                    link: (
                      <EuiLink
                        href={getUrlForApp('management', {
                          path: `data/snapshot_restore/add_repository`,
                        })}
                        target="_blank"
                      >
                        {i18n.translate(
                          'xpack.indexLifecycleMgmt.editPolicy.createSnapshotRepositoryLink',
                          {
                            defaultMessage: 'create a new snapshot repository',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiCallOut>
            );
          }
        }

        return (
          <div className="ilmSearchableSnapshotField">
            <UseField<string>
              config={{
                ...searchableSnapshotFields.snapshot_repository,
                defaultValue: cloud?.isCloudEnabled ? CLOUD_DEFAULT_REPO : undefined,
              }}
              path={searchableSnapshotRepoPath}
            >
              {(field) => {
                const singleSelectionArray: [selectedSnapshot?: string] = field.value
                  ? [field.value]
                  : [];

                return (
                  <ComboBoxField
                    field={
                      {
                        ...field,
                        value: singleSelectionArray,
                      } as any
                    }
                    label={field.label}
                    fullWidth={false}
                    euiFieldProps={{
                      'data-test-subj': 'searchableSnapshotCombobox',
                      options: repos.map((repo) => ({ label: repo, value: repo })),
                      singleSelection: { asPlainText: true },
                      isLoading,
                      noSuggestions: !!(error || repos.length === 0),
                      onCreateOption: (newOption: string) => {
                        field.setValue(newOption);
                      },
                      onChange: (options: EuiComboBoxOptionOption[]) => {
                        if (options.length > 0) {
                          field.setValue(options[0].label);
                        } else {
                          field.setValue('');
                        }
                      },
                    }}
                  />
                );
              }}
            </UseField>
            {calloutContent && (
              <>
                <EuiSpacer size="s" />
                {calloutContent}
              </>
            )}

            <EuiSpacer size="s" />
            <MoreLessSection>
              <UseField
                key={searchableSnapshotStoragePath}
                path={searchableSnapshotStoragePath}
                config={{
                  ...searchableSnapshotFields.storage,
                  defaultValue: isHotPhase || isColdPhase ? 'full_copy' : 'shared_cache',
                }}
                component={SelectField}
                componentProps={{
                  'data-test-subj': `searchableSnapshotStorage`,
                  hasEmptyLabelSpace: true,
                  euiFieldProps: {
                    options: storageOptions,
                    'aria-label': searchableSnapshotFields.storage.label,
                  },
                }}
              />
            </MoreLessSection>
          </div>
        );
      }}
    </SearchableSnapshotDataProvider>
  );

  const renderInfoCallout = (): JSX.Element | undefined => {
    let infoCallout: JSX.Element | undefined;

    if (phase === 'hot' && isUsingSearchableSnapshotInHotPhase) {
      infoCallout = (
        <EuiCallOut
          size="s"
          title={i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotCalloutBody',
            {
              defaultMessage:
                'Force merge, shrink and freeze actions are not allowed when searchable snapshots are enabled in this phase.',
            }
          )}
          data-test-subj="searchableSnapshotFieldsDisabledCallout"
        />
      );
    } else if (isDisabledDueToLicense) {
      infoCallout = (
        <EuiCallOut
          data-test-subj="searchableSnapshotDisabledDueToLicense"
          title={i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotLicenseCalloutTitle',
            { defaultMessage: 'Enterprise license required' }
          )}
          iconType="questionInCircle"
        >
          {i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotLicenseCalloutBody',
            {
              defaultMessage: 'To create a searchable snapshot an enterprise license is required.',
            }
          )}
        </EuiCallOut>
      );
    }

    return infoCallout ? (
      <>
        <EuiSpacer />
        {infoCallout}
        <EuiSpacer />
      </>
    ) : undefined;
  };

  return (
    <DescribedFormRow
      data-test-subj={`searchableSnapshotField-${phase}`}
      switchProps={{
        checked: isFieldToggleChecked,
        disabled: isDisabledDueToLicense,
        onChange: setIsFieldToggleChecked,
        'data-test-subj': 'searchableSnapshotToggle',
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotsToggleLabel',
          { defaultMessage: 'Create searchable snapshot' }
        ),
      }}
      title={
        <h3>
          {i18n.translate('xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotFieldTitle', {
            defaultMessage: 'Searchable snapshot',
          })}
        </h3>
      }
      description={
        <>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotFieldDescription"
              defaultMessage="Take a snapshot of the managed index in the selected repository and mount it as a searchable snapshot. {learnMoreLink}"
              values={{
                learnMoreLink: <LearnMoreLink docPath="ilm-searchable-snapshot.html" />,
              }}
            />
          </EuiTextColor>
        </>
      }
      fieldNotices={renderInfoCallout()}
      fullWidth
    >
      {isDisabledDueToLicense ? <div /> : renderField}
    </DescribedFormRow>
  );
};
