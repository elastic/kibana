/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';

import type {
  ExternalRuleSourceOutput,
  GithubRuleSourceInput,
} from '../../../../../common/api/detection_engine/external_rule_sources/model/external_rule_source.gen';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { useCreateRuleSourceMutation } from '../../../rule_management/api/hooks/external_rule_sources/use_create_rule_source_mutation';
import { useFetchExternalRuleSourcesQuery } from '../../../rule_management/api/hooks/external_rule_sources/use_fetch_external_rule_sources';
import { useBootstrapPrebuiltRulesMutation } from '../../../rule_management/api/hooks/use_bootstrap_prebuilt_rules';
import * as i18n from './translations';
import { useDeleteRuleSourceMutation } from '../../../rule_management/api/hooks/external_rule_sources/use_delete_rule_source_mutation';

interface RuleSourcesFlyoutProps {
  onClose: () => void;
}

export const RuleSourcesFlyout = React.memo(({ onClose }: RuleSourcesFlyoutProps) => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const { data, isFetching: isFetchingRuleSources } = useFetchExternalRuleSourcesQuery({
    page,
    perPage: pageSize,
  });
  const [isAddNewFormVisible, showAddNewForm, hideAddNewForm] = useBoolState(false);
  const { mutateAsync: createRuleSource, isLoading: isCreatingRuleSource } =
    useCreateRuleSourceMutation();
  const { mutateAsync: bootstrapPrebuiltRules } = useBootstrapPrebuiltRulesMutation();

  const addRuleSource = useCallback(
    async (source: GithubRuleSourceInput) => {
      hideAddNewForm();
      await createRuleSource(source);
      await bootstrapPrebuiltRules();
    },
    [bootstrapPrebuiltRules, createRuleSource, hideAddNewForm]
  );

  const isEmpty = data?.results.length === 0;

  return (
    <>
      <EuiFlyout onClose={onClose} maxWidth={800}>
        {(isFetchingRuleSources || isCreatingRuleSource) && (
          <EuiProgress size="xs" color="accent" />
        )}
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>{i18n.RULE_SOURCES_FLYOUT_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isEmpty && (
            <EuiEmptyPrompt
              color="subdued"
              title={<h2>{i18n.RULE_SOURCES_EMPTY_PROMPT_TITLE}</h2>}
              body={<p>{i18n.RULE_SOURCES_EMPTY_PROMPT_BODY}</p>}
              actions={[
                <EuiButton iconType="plusInCircle" color="primary" fill>
                  {i18n.RULE_SOURCES_EMPTY_PROMPT_BUTTON}
                </EuiButton>,
              ]}
            />
          )}
          {data?.results.map((source) => (
            <RuleSourceItem key={source.id} source={source} />
          ))}
          {isAddNewFormVisible && (
            <>
              <EuiSpacer size="m" />
              <AddRuleSourceForm onCancel={hideAddNewForm} onSave={addRuleSource} />
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton iconType="plusInCircle" color="primary" fill onClick={showAddNewForm}>
            {i18n.RULE_SOURCES_EMPTY_PROMPT_BUTTON}
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
});

RuleSourcesFlyout.displayName = 'RuleSourcesFlyout';

interface RuleSourceItemProps {
  source: ExternalRuleSourceOutput;
}

const RuleSourceItem = ({ source }: RuleSourceItemProps) => {
  const { owner, repo, id } = source;
  const token = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const htmlId = useGeneratedHtmlId();

  const { mutateAsync: deleteRuleSource } = useDeleteRuleSourceMutation();

  const handleDelete = useCallback(() => deleteRuleSource({ id }), [deleteRuleSource, id]);

  return (
    <EuiAccordion
      id={htmlId}
      element="fieldset"
      borders="horizontal"
      buttonProps={{
        paddingSize: 'm',
        css: css`
          &:hover {
            text-decoration: none;
          }
        `,
      }}
      buttonContent={
        <div>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoGithub" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>{`${i18n.RULES_SOURCE_GITHUB_REPOSITORY_TITLE} (${owner}/${repo})`}</h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="s" color="subdued">
            {i18n.RULES_SOURCE_GITHUB_REPOSITORY_DESCRIPTION}
          </EuiText>
        </div>
      }
      extraAction={
        <EuiButtonIcon aria-label="Delete" iconType="cross" color="danger" onClick={handleDelete} />
      }
      paddingSize="l"
    >
      <EuiForm component="form">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Owner">
              <EuiFieldText icon="user" placeholder="Owner" value={owner} readOnly />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Repository">
              <EuiFieldText placeholder="Repository" value={repo} readOnly />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFormRow label="Token" helpText="GitHub access token" fullWidth>
          <EuiFieldPassword value={token} readOnly fullWidth />
        </EuiFormRow>
      </EuiForm>
    </EuiAccordion>
  );
};

interface AddRuleSourceFormProps {
  onCancel: () => void;
  onSave: (source: GithubRuleSourceInput) => void;
}

const AddRuleSourceForm = ({ onCancel, onSave }: AddRuleSourceFormProps) => {
  const [owner, setOwner] = React.useState('');
  const [repo, setRepo] = React.useState('');
  const [token, setToken] = React.useState('');

  const handleSave = useCallback(
    () =>
      onSave({
        type: 'github',
        owner,
        repo,
        token,
      }),
    [onSave, owner, repo, token]
  );

  return (
    <EuiForm component="form">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="Owner">
            <EuiFieldText
              icon="user"
              placeholder="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Repository">
            <EuiFieldText
              placeholder="Repository"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="Token" helpText="GitHub access token" fullWidth>
            <EuiFieldText fullWidth value={token} onChange={(e) => setToken(e.target.value)} />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiButton onClick={onCancel}>{i18n.RULE_SOURCE_CANCEL_BUTTON}</EuiButton>
        <EuiButton fill onClick={handleSave}>
          {i18n.RULE_SOURCE_SAVE_BUTTON}
        </EuiButton>
      </EuiFlexGroup>
    </EuiForm>
  );
};
