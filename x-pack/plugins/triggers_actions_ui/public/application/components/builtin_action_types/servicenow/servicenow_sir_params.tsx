/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiSelectOption,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionParamsProps } from '../../../../types';
import { ServiceNowSIRActionParams } from './types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

import * as i18n from './translations';
import { useGetChoices, Choice } from './use_get_choices';

const ServiceNowParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowSIRActionParams>
> = ({ actionConnector, actionParams, editAction, index, errors, messageVariables }) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      (({
        incident: {},
        comments: [],
      } as unknown) as ServiceNowSIRActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const [categories, setCategories] = useState<EuiSelectOption[]>([]);
  const [subcategories, setSubcategories] = useState<Choice[]>([]);

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      const newProps =
        key !== 'comments'
          ? {
              incident: { ...incident, [key]: value },
              comments,
            }
          : { incident, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [comments, editAction, incident, index]
  );

  const editComment = useCallback(
    (key, value) => {
      if (value.length > 0) {
        editSubActionProperty(key, [{ commentId: '1', comment: value }]);
      }
    },
    [editSubActionProperty]
  );

  const onCategorySuccess = (choices: Choice[]) =>
    setCategories(choices.map((choice) => ({ value: choice.value, text: choice.label })));
  const onSubcategorySuccess = (choices: Choice[]) => setSubcategories(choices);

  const { isLoading: isLoadingCategories } = useGetChoices({
    http,
    toastNotifications: toasts,
    actionConnector,
    field: 'category',
    onSuccess: onCategorySuccess,
  });

  const { isLoading: isLoadingSubCategories } = useGetChoices({
    http,
    toastNotifications: toasts,
    actionConnector,
    field: 'subcategory',
    onSuccess: onSubcategorySuccess,
  });

  const subcategoriesOptions = useMemo(
    () =>
      subcategories
        .filter((subcategory) => subcategory.dependent_value === incident.category)
        .map((subcategory) => ({ value: subcategory.value, text: subcategory.label })),
    [incident.category, subcategories]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>{i18n.INCIDENT}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors['subActionParams.incident.short_description']}
        isInvalid={
          errors['subActionParams.incident.short_description'].length > 0 &&
          incident.short_description !== undefined
        }
        label={i18n.SHORT_DESCRIPTION_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'short_description'}
          inputTargetValue={incident?.short_description ?? undefined}
          errors={errors['subActionParams.incident.short_description'] as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.SOURCE_IP_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'source_ip'}
          inputTargetValue={incident?.source_ip ?? undefined}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.DEST_IP_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'dest_ip'}
          inputTargetValue={incident?.dest_ip ?? undefined}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.MALWARE_URL_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'malware_url'}
          inputTargetValue={incident?.malware_url ?? undefined}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.MALWARE_HASH_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'malware_hash'}
          inputTargetValue={incident?.malware_hash ?? undefined}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.CATEGORY_LABEL}>
            <EuiSelect
              fullWidth
              data-test-subj="categorySelect"
              hasNoInitialSelection
              isLoading={isLoadingCategories}
              disabled={isLoadingCategories}
              options={categories}
              value={incident.category ?? undefined}
              onChange={(e) => {
                editAction(
                  'subActionParams',
                  {
                    incident: { ...incident, category: e.target.value, subcategory: null },
                    comments,
                  },
                  index
                );
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SUBCATEGORY_LABEL}>
            <EuiSelect
              fullWidth
              data-test-subj="subcategorySelect"
              hasNoInitialSelection
              isLoading={isLoadingCategories || isLoadingSubCategories}
              disabled={isLoadingCategories || isLoadingSubCategories}
              options={subcategoriesOptions}
              // Needs an empty string instead of undefined to select the blank option when changing categories
              value={incident.subcategory ?? ''}
              onChange={(e) => editSubActionProperty('subcategory', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={incident.description ?? undefined}
        label={i18n.DESCRIPTION_LABEL}
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        label={i18n.COMMENTS_LABEL}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
