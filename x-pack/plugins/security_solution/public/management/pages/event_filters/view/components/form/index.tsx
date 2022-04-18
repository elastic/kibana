/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { isEqual } from 'lodash';
import {
  EuiFieldText,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiText,
  EuiHorizontalRule,
  EuiTextArea,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EVENT_FILTERS_OPERATORS } from '@kbn/securitysolution-list-utils';
import { OperatingSystem } from '@kbn/securitysolution-utils';

import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import type { OnChangeProps } from '@kbn/lists-plugin/public';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import { AddExceptionComments } from '../../../../../../common/components/exceptions/add_exception_comments';
import { filterIndexPatterns } from '../../../../../../common/components/exceptions/helpers';
import { Loader } from '../../../../../../common/components/loader';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { AppAction } from '../../../../../../common/store/actions';
import { useEventFiltersSelector } from '../../hooks';
import { getFormEntryStateMutable, getHasNameError, getNewComment } from '../../../store/selector';
import {
  NAME_LABEL,
  NAME_ERROR,
  DESCRIPTION_LABEL,
  DESCRIPTION_PLACEHOLDER,
  NAME_PLACEHOLDER,
  OS_LABEL,
  RULE_NAME,
} from './translations';
import { OS_TITLES } from '../../../../../common/translations';
import { ENDPOINT_EVENT_FILTERS_LIST_ID, EVENT_FILTER_LIST_TYPE } from '../../../constants';
import { ABOUT_EVENT_FILTERS } from '../../translations';
import {
  EffectedPolicySelect,
  EffectedPolicySelection,
  EffectedPolicySelectProps,
} from '../../../../../components/effected_policy_select';
import {
  getArtifactTagsByEffectedPolicySelection,
  getArtifactTagsWithoutPolicies,
  getEffectedPolicySelectionByTags,
  isGlobalPolicyEffected,
} from '../../../../../components/effected_policy_select/utils';
import { useLicense } from '../../../../../../common/hooks/use_license';

const OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  OperatingSystem.MAC,
  OperatingSystem.WINDOWS,
  OperatingSystem.LINUX,
];

const getAddedFieldsCounts = (formFields: string[]): { [k: string]: number } =>
  formFields.reduce<{ [k: string]: number }>((allFields, field) => {
    if (field in allFields) {
      allFields[field]++;
    } else {
      allFields[field] = 1;
    }
    return allFields;
  }, {});

const computeHasDuplicateFields = (formFieldsList: Record<string, number>): boolean =>
  Object.values(formFieldsList).some((e) => e > 1);
interface EventFiltersFormProps {
  allowSelectOs?: boolean;
  policies: PolicyData[];
  arePoliciesLoading: boolean;
}
export const EventFiltersForm: React.FC<EventFiltersFormProps> = memo(
  ({ allowSelectOs = false, policies, arePoliciesLoading }) => {
    const { http, unifiedSearch } = useKibana().services;

    const dispatch = useDispatch<Dispatch<AppAction>>();
    const exception = useEventFiltersSelector(getFormEntryStateMutable);
    const hasNameError = useEventFiltersSelector(getHasNameError);
    const newComment = useEventFiltersSelector(getNewComment);
    const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const [hasFormChanged, setHasFormChanged] = useState(false);
    const [hasDuplicateFields, setHasDuplicateFields] = useState<boolean>(false);

    // This value has to be memoized to avoid infinite useEffect loop on useFetchIndex
    const indexNames = useMemo(() => ['logs-endpoint.events.*'], []);
    const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(indexNames);

    const [selection, setSelection] = useState<EffectedPolicySelection>({
      selected: [],
      isGlobal: isGlobalPolicyEffected(exception?.tags),
    });

    const isEditMode = useMemo(() => !!exception?.item_id, [exception?.item_id]);
    const [wasByPolicy, setWasByPolicy] = useState(!isGlobalPolicyEffected(exception?.tags));

    const showAssignmentSection = useMemo(() => {
      return (
        isPlatinumPlus ||
        (isEditMode &&
          (!selection.isGlobal || (wasByPolicy && selection.isGlobal && hasFormChanged)))
      );
    }, [isEditMode, selection.isGlobal, hasFormChanged, isPlatinumPlus, wasByPolicy]);

    // set current policies if not previously selected
    useEffect(() => {
      if (selection.selected.length === 0 && exception?.tags) {
        setSelection(getEffectedPolicySelectionByTags(exception.tags, policies));
      }
    }, [exception?.tags, policies, selection.selected.length]);

    // set initial state of `wasByPolicy` that checks if the initial state of the exception was by policy or not
    useEffect(() => {
      if (!hasFormChanged && exception?.tags) {
        setWasByPolicy(!isGlobalPolicyEffected(exception?.tags));
      }
    }, [exception?.tags, hasFormChanged]);

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () => OPERATING_SYSTEMS.map((os) => ({ value: os, inputDisplay: OS_TITLES[os] })),
      []
    );

    const handleOnBuilderChange = useCallback(
      (arg: OnChangeProps) => {
        if (
          (!hasFormChanged && arg.exceptionItems[0] === undefined) ||
          isEqual(arg.exceptionItems[0]?.entries, exception?.entries)
        ) {
          const addedFields = arg.exceptionItems[0]?.entries.map((e) => e.field) || [''];
          setHasDuplicateFields(computeHasDuplicateFields(getAddedFieldsCounts(addedFields)));
          setHasFormChanged(true);
          return;
        }
        setHasFormChanged(true);
        dispatch({
          type: 'eventFiltersChangeForm',
          payload: {
            ...(arg.exceptionItems[0] !== undefined
              ? {
                  entry: {
                    ...arg.exceptionItems[0],
                    name: exception?.name ?? '',
                    description: exception?.description ?? '',
                    comments: exception?.comments ?? [],
                    os_types: exception?.os_types ?? [OperatingSystem.WINDOWS],
                    tags: exception?.tags ?? [],
                  },
                  hasItemsError: arg.errorExists || !arg.exceptionItems[0]?.entries?.length,
                }
              : {
                  hasItemsError: true,
                }),
          },
        });
      },
      [dispatch, exception, hasFormChanged]
    );

    const handleOnChangeName = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!exception) return;
        setHasFormChanged(true);
        const name = e.target.value.toString().trim();
        dispatch({
          type: 'eventFiltersChangeForm',
          payload: {
            entry: { ...exception, name },
            hasNameError: !name,
          },
        });
      },
      [dispatch, exception]
    );

    const handleOnDescriptionChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!exception) return;
        setHasFormChanged(true);
        const description = e.target.value.toString().trim();
        dispatch({
          type: 'eventFiltersChangeForm',
          payload: {
            entry: { ...exception, description },
          },
        });
      },
      [dispatch, exception]
    );

    const handleOnChangeComment = useCallback(
      (value: string) => {
        if (!exception) return;
        setHasFormChanged(true);
        dispatch({
          type: 'eventFiltersChangeForm',
          payload: {
            entry: exception,
            newComment: value,
          },
        });
      },
      [dispatch, exception]
    );

    const exceptionBuilderComponentMemo = useMemo(
      () =>
        getExceptionBuilderComponentLazy({
          allowLargeValueLists: false,
          httpService: http,
          autocompleteService: unifiedSearch.autocomplete,
          exceptionListItems: [exception as ExceptionListItemSchema],
          listType: EVENT_FILTER_LIST_TYPE,
          listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
          listNamespaceType: 'agnostic',
          ruleName: RULE_NAME,
          indexPatterns,
          isOrDisabled: true,
          isOrHidden: true,
          isAndDisabled: false,
          isNestedDisabled: false,
          dataTestSubj: 'alert-exception-builder',
          idAria: 'alert-exception-builder',
          onChange: handleOnBuilderChange,
          listTypeSpecificIndexPatternFilter: filterIndexPatterns,
          operatorsList: EVENT_FILTERS_OPERATORS,
          osTypes: exception?.os_types,
        }),
      [unifiedSearch, handleOnBuilderChange, http, indexPatterns, exception]
    );

    const nameInputMemo = useMemo(
      () => (
        <EuiFormRow
          label={NAME_LABEL}
          fullWidth
          isInvalid={hasNameError && hasBeenInputNameVisited}
          error={NAME_ERROR}
        >
          <EuiFieldText
            id="eventFiltersFormInputName"
            placeholder={NAME_PLACEHOLDER}
            defaultValue={exception?.name ?? ''}
            onChange={handleOnChangeName}
            fullWidth
            aria-label={NAME_PLACEHOLDER}
            required={hasBeenInputNameVisited}
            maxLength={256}
            onBlur={() => !hasBeenInputNameVisited && setHasBeenInputNameVisited(true)}
          />
        </EuiFormRow>
      ),
      [hasNameError, exception?.name, handleOnChangeName, hasBeenInputNameVisited]
    );

    const descriptionInputMemo = useMemo(
      () => (
        <EuiFormRow label={DESCRIPTION_LABEL} fullWidth>
          <EuiTextArea
            id="eventFiltersFormInputDescription"
            placeholder={DESCRIPTION_PLACEHOLDER}
            defaultValue={exception?.description ?? ''}
            onChange={handleOnDescriptionChange}
            fullWidth
            data-test-subj="eventFilters-form-description-input"
            aria-label={DESCRIPTION_PLACEHOLDER}
            maxLength={256}
          />
        </EuiFormRow>
      ),
      [exception?.description, handleOnDescriptionChange]
    );

    const osInputMemo = useMemo(
      () => (
        <EuiFormRow label={OS_LABEL} fullWidth>
          <EuiSuperSelect
            name="os"
            options={osOptions}
            fullWidth
            valueOfSelected={
              exception?.os_types ? exception.os_types[0] : OS_TITLES[OperatingSystem.WINDOWS]
            }
            onChange={(value) => {
              if (!exception) return;
              dispatch({
                type: 'eventFiltersChangeForm',
                payload: {
                  entry: {
                    ...exception,
                    os_types: [value as 'windows' | 'linux' | 'macos'],
                  },
                },
              });
            }}
          />
        </EuiFormRow>
      ),
      [dispatch, exception, osOptions]
    );

    const commentsInputMemo = useMemo(
      () => (
        <AddExceptionComments
          exceptionItemComments={(exception as ExceptionListItemSchema)?.comments}
          newCommentValue={newComment}
          newCommentOnChange={handleOnChangeComment}
        />
      ),
      [exception, handleOnChangeComment, newComment]
    );

    const detailsSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.detailsSectionTitle"
                defaultMessage="Details"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>{ABOUT_EVENT_FILTERS}</p>
          </EuiText>
          <EuiSpacer size="m" />
          {nameInputMemo}
          {descriptionInputMemo}
        </>
      ),
      [nameInputMemo, descriptionInputMemo]
    );

    const criteriaSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.criteriaSectionTitle"
                defaultMessage="Conditions"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.criteriaSectionDescription"
                defaultMessage="Select an operating system and add conditions."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {allowSelectOs ? (
            <>
              {osInputMemo}
              <EuiSpacer />
            </>
          ) : null}
          {exceptionBuilderComponentMemo}
        </>
      ),
      [allowSelectOs, exceptionBuilderComponentMemo, osInputMemo]
    );

    const handleOnChangeEffectScope: EffectedPolicySelectProps['onChange'] = useCallback(
      (currentSelection) => {
        if (currentSelection.isGlobal) {
          // Preserve last selection inputs
          setSelection({ ...selection, isGlobal: true });
        } else {
          setSelection(currentSelection);
        }

        if (!exception) return;
        setHasFormChanged(true);

        dispatch({
          type: 'eventFiltersChangeForm',
          payload: {
            entry: {
              ...exception,
              tags: getArtifactTagsByEffectedPolicySelection(
                currentSelection,
                getArtifactTagsWithoutPolicies(exception?.tags ?? [])
              ),
            },
          },
        });
      },
      [dispatch, exception, selection]
    );
    const policiesSection = useMemo(
      () => (
        <EffectedPolicySelect
          selected={selection.selected}
          options={policies}
          isGlobal={selection.isGlobal}
          isLoading={arePoliciesLoading}
          isPlatinumPlus={isPlatinumPlus}
          onChange={handleOnChangeEffectScope}
          data-test-subj={'effectedPolicies-select'}
        />
      ),
      [policies, selection, isPlatinumPlus, handleOnChangeEffectScope, arePoliciesLoading]
    );

    const commentsSection = useMemo(
      () => (
        <>
          <EuiText size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.commentsSectionTitle"
                defaultMessage="Comments"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.commentsSectionDescription"
                defaultMessage="Add a comment to your event filter."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          {commentsInputMemo}
        </>
      ),
      [commentsInputMemo]
    );

    if (isIndexPatternLoading || !exception) {
      return <Loader size="xl" />;
    }

    return (
      <EuiForm component="div">
        {detailsSection}
        <EuiHorizontalRule />
        {criteriaSection}
        {hasDuplicateFields && (
          <>
            <EuiSpacer size="xs" />
            <EuiText color="subdued" size="xs" data-test-subj="duplicate-fields-warning-message">
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.warningMessage.duplicateFields"
                defaultMessage="Using multiples of the same filed values can degrade Endpoint performance and/or create ineffective rules"
              />
            </EuiText>
          </>
        )}
        {showAssignmentSection && (
          <>
            <EuiHorizontalRule /> {policiesSection}
          </>
        )}
        <EuiHorizontalRule />
        {commentsSection}
      </EuiForm>
    );
  }
);

EventFiltersForm.displayName = 'EventFiltersForm';
