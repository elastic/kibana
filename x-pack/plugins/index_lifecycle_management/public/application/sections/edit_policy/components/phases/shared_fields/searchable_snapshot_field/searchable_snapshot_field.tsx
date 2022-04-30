/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTextColor, EuiSpacer, EuiCallOut, EuiLink } from '@elastic/eui';

import { useKibana, useFormData } from '../../../../../../../shared_imports';
import { useEditPolicyContext } from '../../../../edit_policy_context';
import { useConfiguration, UseField, globalFields } from '../../../../form';
import { FieldLoadingError, DescribedFormRow, LearnMoreLink } from '../../../';
import { SearchableSnapshotDataProvider } from './searchable_snapshot_data_provider';
import { RepositoryComboBoxField } from './repository_combobox_field';

import './_searchable_snapshot_field.scss';

export interface Props {
  phase: 'hot' | 'cold' | 'frozen';
  canBeDisabled?: boolean;
}

const geti18nTexts = (
  phase: Props['phase'],
  fullyMountedSearchableSnapshotLink: string,
  partiallyMountedSearchableSnapshotLink: string
) => {
  switch (phase) {
    // Hot and cold phases both create fully mounted snapshots.
    case 'hot':
    case 'cold':
      return {
        title: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.fullyMountedSearchableSnapshotField.title',
          {
            defaultMessage: 'Searchable snapshot',
          }
        ),
        description: (
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.fullyMountedSearchableSnapshotField.description"
            defaultMessage="Convert to a fully-mounted index that contains a complete copy of your data and is backed by a snapshot. You can reduce the number of replicas and rely on the snapshot for resiliency. {learnMoreLink}"
            values={{
              learnMoreLink: <LearnMoreLink docPath={fullyMountedSearchableSnapshotLink} />,
            }}
          />
        ),
        toggleLabel: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.fullyMountedSearchableSnapshotField.toggleLabel',
          { defaultMessage: 'Convert to fully-mounted index' }
        ),
      };

    // Frozen phase creates a partially mounted snapshot.
    case 'frozen':
      return {
        title: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.partiallyMountedSearchableSnapshotField.title',
          {
            defaultMessage: 'Searchable snapshot',
          }
        ),
        description: (
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.frozenPhase.partiallyMountedSearchableSnapshotField.description"
            defaultMessage="Convert to a partially-mounted index that caches the index metadata. Data is retrieved from the snapshot as needed to process search requests. This minimizes the index footprint while keeping all of your data fully searchable. {learnMoreLink}"
            values={{
              learnMoreLink: <LearnMoreLink docPath={partiallyMountedSearchableSnapshotLink} />,
            }}
          />
        ),
        toggleLabel: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.partiallyMountedSearchableSnapshotField.toggleLabel',
          { defaultMessage: 'Convert to partially-mounted index' }
        ),
      };
  }
};

export const SearchableSnapshotField: FunctionComponent<Props> = ({
  phase,
  canBeDisabled = true,
}) => {
  const {
    services: { cloud, docLinks, getUrlForApp },
  } = useKibana();
  const { policy, license, isNewPolicy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase } = useConfiguration();

  const searchableSnapshotRepoPath = `phases.${phase}.actions.searchable_snapshot.snapshot_repository`;

  const [formData] = useFormData({
    watch: globalFields.searchableSnapshotRepo.path,
  });

  const searchableSnapshotGlobalRepo = get(formData, globalFields.searchableSnapshotRepo.path);
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
  const fullyMountedSearchableSnapshotLink = docLinks.links.elasticsearch.ilmSearchableSnapshot;
  const partiallyMountedSearchableSnapshotLink =
    docLinks.links.elasticsearch.searchableSnapshotSharedCache;
  const i18nTexts = geti18nTexts(
    phase,
    fullyMountedSearchableSnapshotLink,
    partiallyMountedSearchableSnapshotLink
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
          } else if (
            searchableSnapshotGlobalRepo &&
            !repos.includes(searchableSnapshotGlobalRepo)
          ) {
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
            <UseField
              path={searchableSnapshotRepoPath}
              defaultValue={!!searchableSnapshotGlobalRepo ? [searchableSnapshotGlobalRepo] : []}
              component={RepositoryComboBoxField}
              componentProps={{
                globalRepository: searchableSnapshotGlobalRepo,
                isLoading,
                repos,
                noSuggestions: !!(error || repos.length === 0),
              }}
            />
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
                'Force merge, shrink and read only actions are not allowed when converting data to a fully-mounted index in this phase.',
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
              label: i18nTexts.toggleLabel,
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
