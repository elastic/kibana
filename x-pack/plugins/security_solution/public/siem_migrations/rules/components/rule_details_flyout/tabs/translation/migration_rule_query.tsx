/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { VALIDATION_WARNING_CODES } from '../../../../../../detection_engine/rule_creation/constants/validation_warning_codes';
import { useFormWithWarnings } from '../../../../../../common/hooks/use_form_with_warnings';
import { EsqlQueryEdit } from '../../../../../../detection_engine/rule_creation/components/esql_query_edit';
import { Field, Form, getUseField } from '../../../../../../shared_imports';
import type { RuleTranslationSchema } from './types';
import { schema } from './schema';
import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface MigrationRuleQueryProps {
  title: string;
  ruleName?: string;
  query: string;
  canEdit?: boolean;
  onTranslationUpdate?: (ruleName: string, ruleQuery: string) => Promise<void>;
}

export const MigrationRuleQuery: React.FC<MigrationRuleQueryProps> = React.memo(
  ({ title, ruleName, query, canEdit, onTranslationUpdate }) => {
    const { euiTheme } = useEuiTheme();

    const formDefaultValue: RuleTranslationSchema = useMemo(() => {
      return {
        ruleName: ruleName ?? '',
        queryBar: {
          query: {
            query,
            language: 'esql',
          },
        },
      };
    }, [query, ruleName]);
    const { form } = useFormWithWarnings<RuleTranslationSchema>({
      defaultValue: formDefaultValue,
      options: { stripEmptyFields: false, warningValidationCodes: VALIDATION_WARNING_CODES },
      schema,
    });

    const [editMode, setEditMode] = useState(false);
    const onCancel = useCallback(() => setEditMode(false), []);
    const onEdit = useCallback(() => {
      form.reset({ defaultValue: formDefaultValue });
      setEditMode(true);
    }, [form, formDefaultValue]);
    const onSave = useCallback(async () => {
      const { data, isValid } = await form.submit();
      if (isValid) {
        await onTranslationUpdate?.(data.ruleName, data.queryBar.query.query);
        setEditMode(false);
      }
    }, [form, onTranslationUpdate]);

    const headerComponent = useMemo(() => {
      return (
        <EuiFlexGroup
          alignItems="center"
          css={css`
            height: ${euiTheme.size.xxl};
          `}
        >
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }, [euiTheme, title]);

    const readQueryComponent = useMemo(() => {
      if (editMode) {
        return null;
      }
      return (
        <>
          {canEdit ? (
            <EuiFlexGroup direction="row" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="pencil" onClick={onEdit} size="xs">
                  {i18n.EDIT}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiSpacer size="l" />
          )}
          <EuiTitle size="xxs">
            <h3>{ruleName}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiMarkdownFormat textSize="xs">{query}</EuiMarkdownFormat>
        </>
      );
    }, [canEdit, editMode, onEdit, query, ruleName]);

    const editQueryComponent = useMemo(() => {
      if (!editMode) {
        return null;
      }
      return (
        <Form form={form} data-test-subj="ruleMigrationTranslationTab">
          <EuiFlexGroup
            direction="row"
            gutterSize="none"
            justifyContent="flexEnd"
            alignItems="flexStart"
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onCancel} size="xs">
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="save" onClick={onSave} size="xs">
                {i18n.SAVE}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <CommonUseField
            path="ruleName"
            componentProps={{
              idAria: 'ruleMigrationTranslationRuleName',
              'data-test-subj': 'ruleMigrationTranslationRuleName',
              euiFieldProps: {
                fullWidth: true,
              },
            }}
          />
          <EuiSpacer size="m" />
          <EsqlQueryEdit
            path="queryBar"
            dataView={{
              title: '',
              fields: [],
            }}
          />
        </Form>
      );
    }, [editMode, form, onCancel, onSave]);

    return (
      <>
        {headerComponent}
        <EuiHorizontalRule margin="xs" />
        {readQueryComponent}
        {editQueryComponent}
      </>
    );
  }
);
MigrationRuleQuery.displayName = 'MigrationRuleQuery';
