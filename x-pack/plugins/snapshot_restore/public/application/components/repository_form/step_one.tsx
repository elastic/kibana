/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCard,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { Repository, RepositoryType, EmptyRepository } from '../../../../common/types';
import { REPOSITORY_TYPES } from '../../../../common';
import { SectionError, Error } from '../../../shared_imports';

import { useLoadRepositoryTypes } from '../../services/http';
import { textService } from '../../services/text';
import { RepositoryValidation } from '../../services/validation';
import { SectionLoading, RepositoryTypeLogo } from '..';
import { useCore } from '../../app_context';
import { getRepositoryTypeDocUrl } from '../../lib/type_to_doc_url';

interface Props {
  repository: Repository | EmptyRepository;
  onNext: () => void;
  updateRepository: (updatedFields: any) => void;
  validation: RepositoryValidation;
}

export const RepositoryFormStepOne: React.FunctionComponent<Props> = ({
  repository,
  onNext,
  updateRepository,
  validation,
}) => {
  // Load repository types
  const {
    error: repositoryTypesError,
    isLoading: repositoryTypesLoading,
    data: repositoryTypes = [],
  } = useLoadRepositoryTypes();

  const { docLinks } = useCore();

  const hasValidationErrors: boolean = !validation.isValid;

  const onTypeChange = (newType: RepositoryType) => {
    if (repository.type === REPOSITORY_TYPES.source) {
      updateRepository({
        settings: {
          delegateType: newType,
        },
      });
    } else {
      updateRepository({
        type: newType,
        settings: {},
      });
    }
  };

  const snapshotRepoDocLink = (
    <EuiLink href={docLinks.links.plugins.snapshotRestoreRepos} target="_blank">
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.fields.typePluginsDocLinkText"
        defaultMessage="Learn more about repository types."
      />
    </EuiLink>
  );

  const renderNameField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.nameDescriptionTitle"
              defaultMessage="Repository name"
            />
          </h2>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryForm.fields.nameDescription"
          defaultMessage="A unique name for the repository."
        />
      }
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.fields.nameLabel"
            defaultMessage="Name"
          />
        }
        isInvalid={Boolean(hasValidationErrors && validation.errors.name)}
        error={validation.errors.name}
        fullWidth
      >
        <EuiFieldText
          defaultValue={repository.name}
          fullWidth
          onChange={(e) => {
            updateRepository({
              name: e.target.value,
            });
          }}
          data-test-subj="nameInput"
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderTypeCard = (type: RepositoryType, index: number) => {
    const isSelectedType =
      (repository.type === REPOSITORY_TYPES.source
        ? repository.settings.delegateType
        : repository.type) === type;
    const displayName = textService.getRepositoryTypeName(type);

    return (
      <EuiFlexItem key={index}>
        <EuiCard
          title={displayName}
          icon={<RepositoryTypeLogo type={type} size="l" />}
          description={<Fragment />} /* EuiCard requires `description` */
          footer={
            <EuiButtonEmpty
              href={getRepositoryTypeDocUrl(docLinks, type)}
              target="_blank"
              size="xs"
              iconType="iInCircle"
            >
              <FormattedMessage
                id="xpack.snapshotRestore.repositoryForm.fields.typeDocsLinkText"
                defaultMessage="Learn more"
              />
            </EuiButtonEmpty>
          }
          selectable={{
            onClick: () => onTypeChange(type),
            isSelected: isSelectedType,
          }}
          data-test-subj={`${type}RepositoryType`}
        />
      </EuiFlexItem>
    );
  };

  const renderTypes = () => {
    if (repositoryTypesError) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.loadingRepositoryTypesErrorMessage"
              defaultMessage="Error loading repository types"
            />
          }
          error={repositoryTypesError as Error}
        />
      );
    }

    if (repositoryTypesLoading) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.loadingRepositoryTypesDescription"
            defaultMessage="Loading repository types…"
          />
        </SectionLoading>
      );
    }

    if (!repositoryTypes.length) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.noRepositoryTypesErrorTitle"
              defaultMessage="No repository types available"
            />
          }
          color="warning"
          data-test-subj="noRepositoryTypesError"
        >
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.noRepositoryTypesErrorMessage"
            defaultMessage="You can install plugins to enable different repository types. {docLink}"
            values={{
              docLink: snapshotRepoDocLink,
            }}
          />
        </EuiCallOut>
      );
    }

    return (
      <EuiFlexGrid columns={4}>
        {repositoryTypes.map((type: RepositoryType, index: number) => renderTypeCard(type, index))}
      </EuiFlexGrid>
    );
  };

  const renderTypeField = () => {
    return (
      <Fragment>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.typeDescriptionTitle"
              defaultMessage="Repository type"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText id="repositoryTypeDescription" size="s" color="subdued">
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.fields.defaultTypeDescription"
            defaultMessage="Storage location for your snapshots. {docLink}"
            values={{
              docLink: snapshotRepoDocLink,
            }}
          />
        </EuiText>
        <EuiFormRow
          hasEmptyLabelSpace
          describedByIds={['repositoryTypeDescription']}
          fullWidth
          isInvalid={Boolean(hasValidationErrors && validation.errors.type)}
          error={validation.errors.type}
        >
          {renderTypes()}
        </EuiFormRow>
        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  const renderSourceOnlyToggle = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.sourceOnlyDescriptionTitle"
              defaultMessage="Source-only snapshots"
            />
          </h2>
        </EuiTitle>
      }
      description={
        <Fragment>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.fields.sourceOnlyDescription"
            defaultMessage="Creates source-only snapshots that take up to 50% less space. {docLink}"
            values={{
              docLink: (
                <EuiLink
                  href={getRepositoryTypeDocUrl(docLinks, REPOSITORY_TYPES.source)}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.repositoryForm.fields.sourceOnlyDocLinkText"
                    defaultMessage="Learn more about source-only repositories."
                  />
                </EuiLink>
              ),
            }}
          />
        </Fragment>
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace={true} fullWidth>
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.fields.sourceOnlyLabel"
              defaultMessage="Source-only snapshots"
            />
          }
          checked={repository.type === REPOSITORY_TYPES.source}
          onChange={(e) => {
            if (e.target.checked) {
              updateRepository({
                type: REPOSITORY_TYPES.source,
                settings: {
                  ...repository.settings,
                  delegateType: repository.type,
                },
              });
            } else {
              const {
                settings: { delegateType, ...rest },
              } = repository;
              updateRepository({
                type: delegateType || null,
                settings: rest,
              });
            }
          }}
          data-test-subj="sourceOnlyToggle"
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderActions = () => (
    <EuiButton
      color="primary"
      onClick={onNext}
      fill
      iconType="arrowRight"
      iconSide="right"
      data-test-subj="nextButton"
    >
      <FormattedMessage
        id="xpack.snapshotRestore.repositoryForm.nextButtonLabel"
        defaultMessage="Next"
      />
    </EuiButton>
  );

  const renderFormValidationError = () => {
    if (!hasValidationErrors) {
      return null;
    }
    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.validationErrorTitle"
              defaultMessage="Fix errors before continuing."
            />
          }
          color="danger"
          data-test-subj="repositoryFormError"
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  return (
    <Fragment>
      {renderNameField()}
      {renderTypeField()}
      {renderSourceOnlyToggle()}
      {renderFormValidationError()}
      {renderActions()}
    </Fragment>
  );
};
