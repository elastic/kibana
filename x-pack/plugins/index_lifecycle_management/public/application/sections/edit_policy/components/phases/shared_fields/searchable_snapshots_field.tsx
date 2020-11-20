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

import { UseField, ComboBoxField } from '../../../../../../shared_imports';

import { useLoadSnapshotRepositories } from '../../../../../services/api';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { useSearchableSnapshotState } from '../../../form';

import { FieldLoadingError, DescribedFormField } from '../../';

import './_searchable_snapshot_field.scss';

interface Props {
  phase: 'hot' | 'cold';
}

export const SearchableSnapshotsField: FunctionComponent<Props> = ({ phase }) => {
  const { getUrlForApp, policy } = useEditPolicyContext();
  const { isUsingSearchableSnapshotInHotPhase } = useSearchableSnapshotState();
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
      switchProps={{
        label: i18n.translate(
          'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotsToggleLabel',
          { defaultMessage: 'Use searchable snapshot' }
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
          {i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.searchableSnapshotFieldDescription',
            {
              defaultMessage: 'Take a snapshot of the index and mount it as a searchable snapshot.',
            }
          )}
        </EuiTextColor>
      }
      fullWidth
    >
      <div className="ilmSearchableSnapshotField">
        {phase === 'hot' && isUsingSearchableSnapshotInHotPhase && (
          <>
            <EuiCallOut title="Some actions have been disabled" iconType="questionInCircle">
              Force merge, shrink, freeze and searchable snapshots are not allowed when this action
              is enabled in the hot phase.
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
        <UseField<string> path={searchableSnapshotPath}>
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
                  'data-test-subj': 'snapshotPolicyCombobox',
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
