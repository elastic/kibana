/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
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
  UseField,
  ComboBoxField,
  useKibana,
  fieldValidators,
  useFormData,
} from '../../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../../edit_policy_context';
import { useConfigurationIssues } from '../../../../form';

import { i18nTexts } from '../../../../i18n_texts';

import { FieldLoadingError, DescribedFormRow, LearnMoreLink } from '../../../';

import { SearchableSnapshotDataProvider } from './searchable_snapshot_data_provider';

import './_searchable_snapshot_field.scss';

const { emptyField } = fieldValidators;

export interface Props {
  phase: 'hot' | 'cold';
}

/**
 * This repository is provisioned by Elastic Cloud and will always
 * exist as a "managed" repository.
 */
const CLOUD_DEFAULT_REPO = 'found-snapshots';

export const SearchableSnapshotField: FunctionComponent<Props> = ({ phase }) => {
  const {
    services: { cloud },
  } = useKibana();
  const { getUrlForApp, policy, license, isNewPolicy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase, isUsingRollover } = useConfigurationIssues();

  const searchableSnapshotPath = `phases.${phase}.actions.searchable_snapshot.snapshot_repository`;

  const [formData] = useFormData({ watch: searchableSnapshotPath });
  const searchableSnapshotRepo = get(formData, searchableSnapshotPath);

  const isColdPhase = phase === 'cold';
  const isDisabledDueToLicense = !license.canUseSearchableSnapshot();
  const isDisabledInColdDueToHotPhase = isColdPhase && isUsingSearchableSnapshotInHotPhase;
  const isDisabledInColdDueToRollover = isColdPhase && !isUsingRollover;

  const isDisabled =
    isDisabledDueToLicense || isDisabledInColdDueToHotPhase || isDisabledInColdDueToRollover;

  const [isFieldToggleChecked, setIsFieldToggleChecked] = useState(() =>
    Boolean(
      // New policy on cloud should have searchable snapshot on in cold phase
      (isColdPhase && isNewPolicy && cloud?.isCloudEnabled) ||
        policy.phases[phase]?.actions?.searchable_snapshot?.snapshot_repository
    )
  );

  useEffect(() => {
    if (isDisabled) {
      setIsFieldToggleChecked(false);
    }
  }, [isDisabled]);

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
                defaultValue: cloud?.isCloudEnabled ? CLOUD_DEFAULT_REPO : undefined,
                label: i18nTexts.editPolicy.searchableSnapshotsFieldLabel,
                validations: [
                  {
                    validator: emptyField(
                      i18nTexts.editPolicy.errors.searchableSnapshotRepoRequired
                    ),
                  },
                ],
              }}
              path={searchableSnapshotPath}
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
                'Force merge, shrink, freeze and cold phase searchable snapshots are not allowed when searchable snapshots are enabled in the hot phase.',
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
    } else if (isDisabledInColdDueToHotPhase) {
      infoCallout = (
        <EuiCallOut
          size="s"
          data-test-subj="searchableSnapshotFieldsEnabledInHotCallout"
          title={i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotDisabledCalloutBody',
            {
              defaultMessage:
                'Cannot create a searchable snapshot in cold when it is configured in hot phase.',
            }
          )}
        />
      );
    } else if (isDisabledInColdDueToRollover) {
      infoCallout = (
        <EuiCallOut
          size="s"
          data-test-subj="searchableSnapshotFieldsNoRolloverCallout"
          title={i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotNoRolloverCalloutBody',
            {
              defaultMessage:
                'Cannot create a searchable snapshot when rollover is disabled in the hot phase.',
            }
          )}
        />
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
        disabled: isDisabled,
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
              defaultMessage="Take a snapshot of the managed index in the selected repository and mount it as a searchable snapshot. {learnMoreLink}."
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
      {isDisabled ? <div /> : renderField}
    </DescribedFormRow>
  );
};
