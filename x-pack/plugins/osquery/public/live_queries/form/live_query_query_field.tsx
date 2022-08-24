/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, map } from 'lodash';
import type { EuiAccordionProps } from '@elastic/eui';
import { EuiCodeBlock, EuiFormRow, EuiAccordion, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useController, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { OsqueryEditor } from '../../editor';
import { useKibana } from '../../common/lib/kibana';
import { MAX_QUERY_LENGTH } from '../../packs/queries/validations';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import type { SavedQueriesDropdownProps } from '../../saved_queries/saved_queries_dropdown';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';

const StyledEuiAccordion = styled(EuiAccordion)`
  ${({ isDisabled }: { isDisabled?: boolean }) => isDisabled && 'display: none;'}
  .euiAccordion__button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  min-height: 100px;
`;

export interface LiveQueryQueryFieldProps {
  disabled?: boolean;
  handleSubmitForm?: () => void;
}

const LiveQueryQueryFieldComponent: React.FC<LiveQueryQueryFieldProps> = ({
  disabled,
  handleSubmitForm,
}) => {
  const formContext = useFormContext();
  const [advancedContentState, setAdvancedContentState] =
    useState<EuiAccordionProps['forceState']>('closed');
  const permissions = useKibana().services.application.capabilities.osquery;
  const queryType = formContext?.watch('queryType', 'query');

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'query',
    rules: {
      required: {
        message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.emptyQueryError', {
          defaultMessage: 'Query is a required field',
        }),
        value: queryType !== 'pack',
      },
      maxLength: {
        message: i18n.translate('xpack.osquery.liveQuery.queryForm.largeQueryError', {
          defaultMessage: 'Query is too large (max {maxLength} characters)',
          values: { maxLength: MAX_QUERY_LENGTH },
        }),
        value: MAX_QUERY_LENGTH,
      },
    },
    defaultValue: '',
  });

  const handleSavedQueryChange: SavedQueriesDropdownProps['onChange'] = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        formContext?.setValue('query', savedQuery.query);
        formContext?.setValue('savedQueryId', savedQuery.savedQueryId);
        if (!isEmpty(savedQuery.ecs_mapping)) {
          formContext?.setValue(
            'ecs_mapping',
            map(savedQuery.ecs_mapping, (ecsValue, key) => ({
              key,
              result: {
                type: Object.keys(ecsValue)[0],
                value: Object.values(ecsValue)[0] as string,
              },
            }))
          );
        } else {
          formContext?.resetField('ecs_mapping');
        }

        if (!isEmpty(savedQuery.ecs_mapping)) {
          setAdvancedContentState('open');
        }
      } else {
        formContext?.setValue('savedQueryId', null);
      }
    },
    [formContext]
  );

  const handleToggle = useCallback((isOpen) => {
    const newState = isOpen ? 'open' : 'closed';
    setAdvancedContentState(newState);
  }, []);

  const ecsFieldProps = useMemo(
    () => ({
      isDisabled: !permissions.writeLiveQueries,
    }),
    [permissions.writeLiveQueries]
  );

  const isSavedQueryDisabled = useMemo(
    () => !permissions.runSavedQueries || !permissions.readSavedQueries,
    [permissions.readSavedQueries, permissions.runSavedQueries]
  );

  const commands = useMemo(
    () =>
      handleSubmitForm
        ? [
            {
              name: 'submitOnCmdEnter',
              bindKey: { win: 'ctrl+enter', mac: 'cmd+enter' },
              exec: handleSubmitForm,
            },
          ]
        : [],
    [handleSubmitForm]
  );

  return (
    <>
      {!isSavedQueryDisabled && (
        <SavedQueriesDropdown disabled={isSavedQueryDisabled} onChange={handleSavedQueryChange} />
      )}
      <EuiFormRow
        isInvalid={!!error?.message}
        error={error?.message}
        fullWidth
        isDisabled={!permissions.writeLiveQueries || disabled}
      >
        {!permissions.writeLiveQueries || disabled ? (
          <StyledEuiCodeBlock
            language="sql"
            fontSize="m"
            paddingSize="m"
            transparentBackground={!value.length}
          >
            {value}
          </StyledEuiCodeBlock>
        ) : (
          <OsqueryEditor defaultValue={value} onChange={onChange} commands={commands} />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />

      <StyledEuiAccordion
        id="advanced"
        forceState={advancedContentState}
        onToggle={handleToggle}
        buttonContent="Advanced"
      >
        <EuiSpacer size="xs" />
        <ECSMappingEditorField euiFieldProps={ecsFieldProps} />
      </StyledEuiAccordion>
    </>
  );
};

export const LiveQueryQueryField = React.memo(LiveQueryQueryFieldComponent);

// eslint-disable-next-line import/no-default-export
export { LiveQueryQueryField as default };
