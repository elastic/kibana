/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
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
} from '../../../../../../../shared_imports';

import { useLoadSnapshotRepositories } from '../../../../../../services/api';

import { useEditPolicyContext } from '../../../../edit_policy_context';
import { useConfigurationIssues } from '../../../../form';

import { i18nTexts } from '../../../../i18n_texts';

import { FieldLoadingError, DescribedFormField, LearnMoreLink } from '../../../index';

import './_searchable_snapshot_field.scss';

const { emptyField } = fieldValidators;

interface Props {
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
  const { getUrlForApp, policy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase } = useConfigurationIssues();
  const searchableSnapshotPath = `phases.${phase}.actions.searchable_snapshot.snapshot_repository`;
  const { isLoading, error, data, resendRequest } = useLoadSnapshotRepositories();

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
          data-test-subj="noSnapshotRepositoriesCallout"
          iconType="help"
          color="warning"
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.noSnapshotRepositoriesFoundTitle"
              defaultMessage="No snapshot repositories found"
            />
          }
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.noSnapshotRepositoriesFoundMessage"
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
    }
  }

  return (
    <DescribedFormField
      data-test-subj={`searchableSnapshotField-${phase}`}
      switchProps={{
        'data-test-subj': 'searchableSnapshotToggle',
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotsToggleLabel',
          { defaultMessage: 'Create searchable snapshot' }
        ),
        initialValue: Boolean(
          policy.phases[phase]?.actions?.searchable_snapshot?.snapshot_repository
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
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotFieldDescription"
            defaultMessage="Take a snapshot of the managed index in the selected repository and mount it as a searchable snapshot. {learnMoreLink}."
            values={{
              learnMoreLink: <LearnMoreLink docPath="ilm-searchable-snapshot.html" />,
            }}
          />
        </EuiTextColor>
      }
      fullWidth
    >
      <div className="ilmSearchableSnapshotField">
        {phase === 'hot' && isUsingSearchableSnapshotInHotPhase && (
          <>
            <EuiCallOut
              data-test-subj="searchableSnapshotFieldsDisabledCallout"
              title={i18n.translate(
                'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotCalloutTitle',
                { defaultMessage: 'Some actions have been disabled' }
              )}
              iconType="questionInCircle"
            >
              {i18n.translate('xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotCalloutBody', {
                defaultMessage:
                  'Force merge, shrink, freeze and cold phase searchable snapshots are not allowed when searchable snapshots are enabled in the hot phase.',
              })}
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        {calloutContent && (
          <>
            {calloutContent}
            <EuiSpacer size="s" />
          </>
        )}
        <UseField<string>
          config={{
            defaultValue: cloud?.isCloudEnabled ? CLOUD_DEFAULT_REPO : undefined,
            label: i18nTexts.editPolicy.searchableSnapshotsFieldLabel,
            validations: [
              { validator: emptyField(i18nTexts.editPolicy.errors.searchableSnapshotRepoRequired) },
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
      </div>
    </DescribedFormField>
  );
};
