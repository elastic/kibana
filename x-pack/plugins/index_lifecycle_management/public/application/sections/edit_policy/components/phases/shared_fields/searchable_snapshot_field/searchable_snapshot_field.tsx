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

import { ComboBoxField, useKibana, useFormData } from '../../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../../edit_policy_context';
import { useConfigurationIssues, UseField, searchableSnapshotFields } from '../../../../form';
import { FieldLoadingError, DescribedFormRow, LearnMoreLink } from '../../../';
import { SearchableSnapshotDataProvider } from './searchable_snapshot_data_provider';

import './_searchable_snapshot_field.scss';

export interface Props {
  phase: 'hot' | 'cold' | 'frozen';
  canBeDisabled?: boolean;
}

/**
 * This repository is provisioned by Elastic Cloud and will always
 * exist as a "managed" repository.
 */
const CLOUD_DEFAULT_REPO = 'found-snapshots';

const geti18nTexts = (phase: Props['phase']) => ({
  title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotFieldTitle', {
    defaultMessage: 'Searchable snapshot',
  }),
  description:
    phase === 'frozen' ? (
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.searchableSnapshotFieldDescription"
        defaultMessage="Take a snapshot of your data and mount it as a searchable snapshot. To reduce costs, only a cache of the snapshot is mounted in the frozen tier. {learnMoreLink}"
        values={{
          learnMoreLink: (
            <LearnMoreLink docPath="searchable-snapshots.html#searchable-snapshots-shared-cache" />
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotFieldDescription"
        defaultMessage="Take a snapshot of your data and mount it as a searchable snapshot. {learnMoreLink}"
        values={{
          learnMoreLink: <LearnMoreLink docPath="ilm-searchable-snapshot.html" />,
        }}
      />
    ),
});

export const SearchableSnapshotField: FunctionComponent<Props> = ({
  phase,
  canBeDisabled = true,
}) => {
  const {
    services: { cloud },
  } = useKibana();
  const { getUrlForApp, policy, license, isNewPolicy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase } = useConfigurationIssues();

  const searchableSnapshotRepoPath = `phases.${phase}.actions.searchable_snapshot.snapshot_repository`;

  const [formData] = useFormData({ watch: searchableSnapshotRepoPath });
  const searchableSnapshotRepo = get(formData, searchableSnapshotRepoPath);

  const isColdPhase = phase === 'cold';
  const isFrozenPhase = phase === 'frozen';
  const isColdOrFrozenPhase = isColdPhase || isFrozenPhase;
  const isDisabledDueToLicense = !license.canUseSearchableSnapshot();

  const [isFieldToggleChecked, setIsFieldToggleChecked] = useState(() =>
    Boolean(
      // New policy on cloud should have searchable snapshot on in cold and frozen phase
      (isColdOrFrozenPhase && isNewPolicy && cloud?.isCloudEnabled) ||
        policy.phases[phase]?.actions?.searchable_snapshot?.snapshot_repository
    )
  );

  const i18nTexts = geti18nTexts(phase);

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
      switchProps={
        canBeDisabled
          ? {
              checked: isFieldToggleChecked,
              disabled: isDisabledDueToLicense,
              onChange: setIsFieldToggleChecked,
              'data-test-subj': 'searchableSnapshotToggle',
              label: i18n.translate(
                'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotsToggleLabel',
                { defaultMessage: 'Create searchable snapshot' }
              ),
            }
          : undefined
      }
      title={<h3>{i18nTexts.title}</h3>}
      description={
        <>
          <EuiTextColor color="subdued">{i18nTexts.description}</EuiTextColor>
        </>
      }
      fieldNotices={renderInfoCallout()}
      fullWidth
    >
      {isDisabledDueToLicense ? <div /> : renderField}
    </DescribedFormRow>
  );
};
