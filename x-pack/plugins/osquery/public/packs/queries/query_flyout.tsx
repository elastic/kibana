/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiTitle,
  EuiSpacer,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FormProvider } from 'react-hook-form';

import { isEmpty, map } from 'lodash';
import { QueryIdField, IntervalField } from '../../form';
import { defaultEcsFormData } from './ecs_mapping_editor_field';
import { CodeEditorField } from '../../saved_queries/form/code_editor_field';
import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';
import { ALL_OSQUERY_VERSIONS_OPTIONS } from './constants';
import type {
  UsePackQueryFormProps,
  PackQueryFormData,
  PackSOQueryFormData,
} from './use_pack_query_form';
import { usePackQueryForm } from './use_pack_query_form';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { ECSMappingEditorField } from './lazy_ecs_mapping_editor_field';
import { useKibana } from '../../common/lib/kibana';
import { VersionField } from '../../form';

interface QueryFlyoutProps {
  uniqueQueryIds: string[];
  defaultValue?: UsePackQueryFormProps['defaultValue'] | undefined;
  onSave: (payload: PackSOQueryFormData) => void;
  onClose: () => void;
}

const QueryFlyoutComponent: React.FC<QueryFlyoutProps> = ({
  uniqueQueryIds,
  defaultValue,
  onSave,
  onClose,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const [isEditMode] = useState(!!defaultValue);
  const { serializer, idSet, ...hooksForm } = usePackQueryForm({
    uniqueQueryIds,
    defaultValue,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    clearErrors,
  } = hooksForm;
  const onSubmit = (payload: PackQueryFormData) => {
    const serializedData: PackSOQueryFormData = serializer(payload);
    onSave(serializedData);
    onClose();
  };

  const handleSetQueryValue = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        clearErrors('id');
        setValue('id', savedQuery.id);
        setValue('query', savedQuery.query);
        // setValue('description', savedQuery.description); // TODO do we need it?
        setValue('platform', savedQuery.platform ? savedQuery.platform : 'linux,windows,darwin');
        setValue('version', savedQuery.version ? [savedQuery.version] : []);
        setValue('interval', savedQuery.interval);
        setValue(
          'ecs_mapping',
          !isEmpty(savedQuery.ecs_mapping)
            ? map(savedQuery.ecs_mapping, (value, key) => ({
                key,
                result: {
                  type: Object.keys(value)[0],
                  value: Object.values(value)[0] as string,
                },
              }))
            : [defaultEcsFormData]
        );
      }
    },
    [clearErrors, setValue]
  );
  /* Avoids accidental closing of the flyout when the user clicks outside of the flyout */
  const maskProps = useMemo(() => ({ onClick: () => ({}) }), []);

  return (
    <EuiFlyout
      size="m"
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      outsideClickCloses={false}
      maskProps={maskProps}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutTitle">
            {isEditMode ? (
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.editFormTitle"
                defaultMessage="Edit query"
              />
            ) : (
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.addFormTitle"
                defaultMessage="Attach next query"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormProvider {...hooksForm}>
          {!isEditMode && permissions.readSavedQueries ? (
            <>
              <SavedQueriesDropdown onChange={handleSetQueryValue} />
              <EuiSpacer />
            </>
          ) : null}
          <QueryIdField idSet={idSet} />
          <EuiSpacer />
          <CodeEditorField />
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <IntervalField
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{ append: 's' }}
              />
              <EuiSpacer />
              <VersionField
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  noSuggestions: false,
                  singleSelection: { asPlainText: true },
                  placeholder: i18n.translate('xpack.osquery.queriesTable.osqueryVersionAllLabel', {
                    defaultMessage: 'ALL',
                  }),
                  options: ALL_OSQUERY_VERSIONS_OPTIONS,
                  onCreateOption: undefined,
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <PlatformCheckBoxGroupField />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <ECSMappingEditorField />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FormProvider>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton isLoading={isSubmitting} onClick={handleSubmit(onSubmit)} fill>
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const QueryFlyout = React.memo(QueryFlyoutComponent);
