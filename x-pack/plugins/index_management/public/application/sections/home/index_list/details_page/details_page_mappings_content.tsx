/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiEmptyPrompt,
  useGeneratedHtmlId,
  EuiFilterGroup,
  EuiFilterButton,
  EuiCallOut,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Index } from '../../../../../../common';
import { useAppContext } from '../../../../app_context';
import { DocumentFieldsSearch } from '../../../../components/mappings_editor/components/document_fields/document_fields_search';
import { FieldsList } from '../../../../components/mappings_editor/components/document_fields/fields';
import { SearchResult } from '../../../../components/mappings_editor/components/document_fields/search_fields';
import {
  extractMappingsDefinition,
  searchFields,
} from '../../../../components/mappings_editor/lib';
import { MappingsEditorParsedMetadata } from '../../../../components/mappings_editor/mappings_editor';
import {
  useDispatch,
  useMappingsState,
} from '../../../../components/mappings_editor/mappings_state_context';
import { useMappingsStateListener } from '../../../../components/mappings_editor/use_state_listener';
import { documentationService } from '../../../../services';
import { DocumentFields } from '../../../../components/mappings_editor/components';
import { deNormalize } from '../../../../components/mappings_editor/lib';
import { updateIndexMappings } from '../../../../services/api';
import { notificationService } from '../../../../services/notification';
import {
  NormalizedField,
  NormalizedFields,
  State,
} from '../../../../components/mappings_editor/types';

const getFieldsFromState = (state: State) => {
  const getField = (fieldId: string) => {
    return state.fields.byId[fieldId];
  };
  const fields = () => {
    return state.fields.rootLevelFields.map((id) => getField(id));
  };
  return fields();
};
export const DetailsPageMappingsContent: FunctionComponent<{
  index: Index;
  data: string;
  showAboutMappings: boolean;
  jsonData: any;
  refetchMapping: () => void;
  isSemanticTextEnabled?: boolean;
}> = ({
  index,
  data,
  jsonData,
  refetchMapping,
  showAboutMappings,
  isSemanticTextEnabled = false,
}) => {
  const {
    services: { extensionsService },
    core: { getUrlForApp },
  } = useAppContext();

  const state = useMappingsState();
  const dispatch = useDispatch();

  const indexName = index.name;

  const pendingFieldListId = useGeneratedHtmlId({
    prefix: 'pendingFieldListId',
  });

  const [isAddingFields, setAddingFields] = useState<boolean>(false);
  const newFieldsLength = useMemo(() => {
    return Object.keys(state.fields.byId).length;
  }, [state.fields.byId]);

  const [previousState, setPreviousState] = useState<State>(state);
  const [previousStateFields, setPreviousStateFields] = useState<NormalizedField[]>(
    getFieldsFromState(state)
  );
  const [saveMappingError, setSaveMappingError] = useState<string | undefined>(undefined);
  const [isJSONVisible, setIsJSONVisible] = useState<boolean>(false);
  const onToggleChange = () => {
    setIsJSONVisible(!isJSONVisible);
  };

  const mappingsDefinition = extractMappingsDefinition(jsonData);
  const { parsedDefaultValue } = useMemo<MappingsEditorParsedMetadata>(() => {
    if (mappingsDefinition === null) {
      return { multipleMappingsDeclared: true };
    }

    const {
      _source,
      _meta,
      _routing,
      _size,
      dynamic,
      properties,
      runtime,
      /* eslint-disable @typescript-eslint/naming-convention */
      numeric_detection,
      date_detection,
      dynamic_date_formats,
      dynamic_templates,
      /* eslint-enable @typescript-eslint/naming-convention */
    } = mappingsDefinition;

    const parsed = {
      configuration: {
        _source,
        _meta,
        _routing,
        _size,
        dynamic,
        numeric_detection,
        date_detection,
        dynamic_date_formats,
      },
      fields: properties,
      templates: {
        dynamic_templates,
      },
      runtime,
    };

    return { parsedDefaultValue: parsed, multipleMappingsDeclared: false };
  }, [mappingsDefinition]);

  useMappingsStateListener({ value: parsedDefaultValue, status: 'disabled' });

  const onCancelAddingNewFields = useCallback(() => {
    setAddingFields(!isAddingFields);

    //  reset mappings to previous state
    dispatch({
      type: 'editor.replaceMappings',
      value: {
        ...previousState,
        documentFields: {
          status: 'disabled',
          editor: 'default',
        },
      },
    });
  }, [isAddingFields, dispatch, previousState]);

  const addFieldButtonOnClick = useCallback(() => {
    setAddingFields(!isAddingFields);

    // when adding new field, save previous state. This state is then used by FieldsList component to show only saved mappings.
    setPreviousStateFields(getFieldsFromState(state));
    setPreviousState(state);

    // reset mappings and change status to create field.
    dispatch({
      type: 'editor.replaceMappings',
      value: {
        ...state,
        fields: { ...state.fields, byId: {}, rootLevelFields: [] } as NormalizedFields,
        documentFields: {
          status: 'creatingField',
          editor: 'default',
        },
      },
    });
  }, [dispatch, isAddingFields, state]);

  const updateMappings = useCallback(async () => {
    try {
      const { error } = await updateIndexMappings(indexName, deNormalize(state.fields));

      if (!error) {
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.indexDetails.mappings.successfullyUpdatedIndexMappings', {
            defaultMessage: 'Index Mapping was successfully updated',
          })
        );
        refetchMapping();
      } else {
        setSaveMappingError(error.message);
      }
    } catch (exception) {
      setSaveMappingError(exception.message);
    }
  }, [state.fields, indexName, refetchMapping]);

  const onSearchChange = useCallback(
    (value: string) => {
      if (isAddingFields) {
        setPreviousState({
          ...previousState,
          search: {
            term: value,
            result: searchFields(value, previousState.fields.byId),
          },
        });
      } else {
        dispatch({ type: 'search:update', value });
      }
    },
    [dispatch, previousState, isAddingFields]
  );

  const searchTerm = isAddingFields ? previousState.search.term.trim() : state.search.term.trim();

  const jsonBlock = (
    <EuiCodeBlock
      language="json"
      isCopyable
      data-test-subj="indexDetailsMappingsCodeBlock"
      css={css`
        height: 100%;
      `}
    >
      {data}
    </EuiCodeBlock>
  );
  const searchResultComponent = isAddingFields ? (
    <SearchResult
      result={previousState.search.result}
      documentFieldsState={previousState.documentFields}
    />
  ) : (
    <SearchResult result={state.search.result} documentFieldsState={state.documentFields} />
  );

  const fieldsListComponent = isAddingFields ? (
    <FieldsList
      fields={previousStateFields}
      state={previousState}
      setPreviousState={setPreviousState}
      isAddingFields={isAddingFields}
    />
  ) : (
    <FieldsList fields={getFieldsFromState(state)} state={state} isAddingFields={isAddingFields} />
  );
  const fieldSearchComponent = isAddingFields ? (
    <DocumentFieldsSearch
      searchValue={previousState.search.term}
      onSearchChange={onSearchChange}
      disabled={isJSONVisible}
    />
  ) : (
    <DocumentFieldsSearch
      searchValue={state.search.term}
      onSearchChange={onSearchChange}
      disabled={isJSONVisible}
    />
  );
  const treeViewBlock = (
    <>
      {mappingsDefinition === null ? (
        <EuiEmptyPrompt
          color="danger"
          iconType="error"
          title={
            <h2>
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.invalidMappingKeysErrorMessageTitle"
                defaultMessage="Unable to load the mapping"
              />
            </h2>
          }
          body={
            <h2>
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.mappings.invalidMappingKeysErrorMessageBody"
                defaultMessage="The mapping contains invalid keys. Please provide a mapping with valid keys."
              />
            </h2>
          }
        />
      ) : searchTerm !== '' ? (
        searchResultComponent
      ) : (
        fieldsListComponent
      )}
    </>
  );

  const errorSavingMappings = saveMappingError && (
    <EuiFlexItem grow={false}>
      <EuiCallOut
        color="danger"
        data-test-subj="indexDetailsSaveMappingsError"
        iconType="error"
        title={i18n.translate('xpack.idxMgmt.indexDetails.mappings.error.title', {
          defaultMessage: 'Error saving mapping',
        })}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.mappings.error.description"
            defaultMessage="Error saving mapping: {errorMessage}"
            values={{ errorMessage: saveMappingError }}
          />
        </EuiText>
      </EuiCallOut>
      <EuiSpacer />
    </EuiFlexItem>
  );
  return (
    // using "rowReverse" to keep docs links on the top of the mappings code block on smaller screen
    <>
      <EuiFlexGroup
        wrap
        direction="rowReverse"
        css={css`
          height: 100%;
        `}
      >
        {showAboutMappings && (
          <EuiFlexItem
            grow={1}
            css={css`
              min-width: 400px;
            `}
          >
            <EuiPanel grow={false} paddingSize="l">
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="iInCircle" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2>
                      <FormattedMessage
                        id="xpack.idxMgmt.indexDetails.mappings.docsCardTitle"
                        defaultMessage="About index mappings"
                      />
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.docsCardDescription"
                    defaultMessage="Your documents are made up of a set of fields. Index mappings give each field a type
                      (such as keyword, number, or date) and additional subfields. These index mappings determine the functions
                      available in your relevance tuning and search experience."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiLink
                data-test-subj="indexDetailsMappingsDocsLink"
                href={documentationService.getMappingDocumentationLink()}
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.mappings.docsCardLink"
                  defaultMessage="Learn more about mappings"
                />
              </EuiLink>
            </EuiPanel>
            {extensionsService.indexMappingsContent && (
              <>
                <EuiSpacer />
                {extensionsService.indexMappingsContent.renderContent({ index, getUrlForApp })}
              </>
            )}
          </EuiFlexItem>
        )}
        <EuiFlexGroup direction="column">
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
            <EuiFlexItem>{fieldSearchComponent}</EuiFlexItem>
            {!index.hidden && (
              <EuiFlexItem grow={false}>
                {!isAddingFields ? (
                  <EuiButton
                    onClick={addFieldButtonOnClick}
                    iconType="plusInCircle"
                    color="text"
                    size="m"
                    data-test-subj="indexDetailsMappingsAddField"
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.indexDetails.mappings.addNewField"
                      defaultMessage="Add field"
                    />
                  </EuiButton>
                ) : (
                  <EuiButton
                    onClick={updateMappings}
                    color="success"
                    fill
                    disabled={newFieldsLength === 0}
                    data-test-subj="indexDetailsMappingsSaveMappings"
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.indexDetails.mappings.saveMappings"
                      defaultMessage="Save mappings"
                    />
                  </EuiButton>
                )}
              </EuiFlexItem>
            )}

            <EuiFlexItem grow={false}>
              <EuiFilterGroup
                data-test-subj="indexDetailsMappingsToggleViewButton"
                aria-label={i18n.translate(
                  'xpack.idxMgmt.indexDetails.mappings.mappingsViewButtonGroupAriaLabel',
                  {
                    defaultMessage: 'Mappings View Button Group',
                  }
                )}
                onClick={onToggleChange}
              >
                <EuiFilterButton hasActiveFilters={!isJSONVisible} withNext>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.tableView"
                    defaultMessage="List"
                  />
                </EuiFilterButton>
                <EuiFilterButton hasActiveFilters={isJSONVisible}>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.json"
                    defaultMessage="JSON"
                  />
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          {errorSavingMappings}
          {isAddingFields && (
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder>
                <EuiAccordion
                  id={pendingFieldListId}
                  initialIsOpen
                  buttonContent={
                    <EuiPanel paddingSize="s" hasShadow={false}>
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="baseline"
                        data-test-subj="indexDetailsMappingsPendingBlock"
                      >
                        <EuiFlexItem grow={6}>
                          <EuiText size="m">
                            <FormattedMessage
                              id="xpack.idxMgmt.indexDetails.mappings.addMappingPendingBlock"
                              defaultMessage="Pending fields"
                            />
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiNotificationBadge
                            color={newFieldsLength > 0 ? 'accent' : 'subdued'}
                            size="m"
                          >
                            {newFieldsLength}
                          </EuiNotificationBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  }
                >
                  <EuiPanel hasShadow={false}>
                    {newFieldsLength <= 0 ? (
                      <DocumentFields
                        onCancelAddingNewFields={onCancelAddingNewFields}
                        isAddingFields={isAddingFields}
                        isSemanticTextEnabled={isSemanticTextEnabled}
                      />
                    ) : (
                      <DocumentFields
                        isAddingFields={isAddingFields}
                        isSemanticTextEnabled={isSemanticTextEnabled}
                      />
                    )}
                  </EuiPanel>
                </EuiAccordion>
              </EuiPanel>
            </EuiFlexItem>
          )}

          <EuiFlexItem
            grow={false}
            css={css`
              min-width: 600px;
              height: 100%;
            `}
          >
            <EuiPanel hasShadow={false} paddingSize="none">
              {isJSONVisible ? jsonBlock : treeViewBlock}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </>
  );
};
