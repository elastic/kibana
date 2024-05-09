/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { Index } from '../../../../../../common';
import { useDetailsPageMappingsModelManagement } from '../../../../../hooks/use_details_page_mappings_model_management';
import { useAppContext } from '../../../../app_context';
import { DocumentFields } from '../../../../components/mappings_editor/components';
import { DocumentFieldsSearch } from '../../../../components/mappings_editor/components/document_fields/document_fields_search';
import { FieldsList } from '../../../../components/mappings_editor/components/document_fields/fields';
import { SearchResult } from '../../../../components/mappings_editor/components/document_fields/search_fields';
import { MultipleMappingsWarning } from '../../../../components/mappings_editor/components/multiple_mappings_warning';
import { deNormalize, searchFields } from '../../../../components/mappings_editor/lib';
import { MappingsEditorParsedMetadata } from '../../../../components/mappings_editor/mappings_editor';
import {
  useDispatch,
  useMappingsState,
} from '../../../../components/mappings_editor/mappings_state_context';
import {
  getFieldsFromState,
  getFieldsMatchingFilterFromState,
} from '../../../../components/mappings_editor/lib';
import { NormalizedFields, State } from '../../../../components/mappings_editor/types';
import { MappingsFilter } from './details_page_filter_fields';

import { useMappingsStateListener } from '../../../../components/mappings_editor/use_state_listener';
import { documentationService } from '../../../../services';
import { updateIndexMappings } from '../../../../services/api';
import { notificationService } from '../../../../services/notification';
import { SemanticTextBanner } from './semantic_text_banner';
import { TrainedModelsDeploymentModal } from './trained_models_deployment_modal';
import { parseMappings } from '../../../../shared/parse_mappings';

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
    plugins: { ml },
    url,
  } = useAppContext();

  const [errorsInTrainedModelDeployment, setErrorsInTrainedModelDeployment] = useState<string[]>(
    []
  );
  const semanticTextInfo = {
    isSemanticTextEnabled,
    indexName: index.name,
    ml,
    setErrorsInTrainedModelDeployment,
  };

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

  const previousStateSelectedDataTypes: string[] = useMemo(() => {
    return previousState.filter.selectedOptions
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
  }, [previousState.filter.selectedOptions]);

  const [saveMappingError, setSaveMappingError] = useState<string | undefined>(undefined);
  const [isJSONVisible, setIsJSONVisible] = useState<boolean>(false);
  const onToggleChange = () => {
    setIsJSONVisible(!isJSONVisible);
  };

  const { parsedDefaultValue, multipleMappingsDeclared } = useMemo<MappingsEditorParsedMetadata>(
    () => parseMappings(jsonData),
    [jsonData]
  );

  useMappingsStateListener({ value: parsedDefaultValue, status: 'disabled' });
  const { fetchInferenceToModelIdMap, pendingDeployments } = useDetailsPageMappingsModelManagement(
    state.fields,
    state.inferenceToModelIdMap
  );

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
    setPreviousState(state);

    // reset mappings and change status to create field.
    dispatch({
      type: 'editor.replaceMappings',
      value: {
        ...state,
        fields: { ...state.fields, byId: {}, rootLevelFields: [] } as NormalizedFields,
        filter: {
          filteredFields: [],
          selectedOptions: [],
          selectedDataTypes: [],
        },
        documentFields: {
          status: 'creatingField',
          editor: 'default',
        },
      },
    });
  }, [dispatch, isAddingFields, state]);

  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (!isSemanticTextEnabled) {
      return;
    }

    const fetchData = async () => {
      await fetchInferenceToModelIdMap();
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshModal = useCallback(async () => {
    try {
      if (!isSemanticTextEnabled) {
        return;
      }

      await fetchInferenceToModelIdMap();

      setIsModalVisible(pendingDeployments.length > 0);
    } catch (exception) {
      setSaveMappingError(exception.message);
    }
  }, [fetchInferenceToModelIdMap, isSemanticTextEnabled, pendingDeployments]);

  const updateMappings = useCallback(async () => {
    try {
      if (isSemanticTextEnabled) {
        await fetchInferenceToModelIdMap();

        if (pendingDeployments.length > 0) {
          setIsModalVisible(true);
          return;
        }
      }

      const denormalizedFields = deNormalize(state.fields);

      const { error } = await updateIndexMappings(indexName, denormalizedFields);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fields, pendingDeployments]);

  const onSearchChange = useCallback(
    (value: string) => {
      if (isAddingFields) {
        setPreviousState({
          ...previousState,
          search: {
            term: value,
            result: searchFields(
              value,
              previousStateSelectedDataTypes.length > 0
                ? getFieldsMatchingFilterFromState(previousState, previousStateSelectedDataTypes)
                : previousState.fields.byId
            ),
          },
        });
      } else {
        dispatch({ type: 'search:update', value });
      }
    },
    [dispatch, previousState, isAddingFields, previousStateSelectedDataTypes]
  );

  const onClearSearch = useCallback(() => {
    setPreviousState({
      ...previousState,
      search: {
        term: '',
        result: searchFields(
          '',
          previousState.filter.selectedDataTypes.length > 0
            ? getFieldsMatchingFilterFromState(
                previousState,
                previousState.filter.selectedDataTypes
              )
            : previousState.fields.byId
        ),
      },
    });
  }, [previousState]);

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
      onClearSearch={onClearSearch}
    />
  ) : (
    <SearchResult result={state.search.result} documentFieldsState={state.documentFields} />
  );

  const fieldsListComponent = isAddingFields ? (
    <FieldsList
      fields={
        previousStateSelectedDataTypes.length > 0
          ? previousState.filter.filteredFields
          : getFieldsFromState(previousState.fields)
      }
      state={previousState}
      setPreviousState={setPreviousState}
      isAddingFields={isAddingFields}
    />
  ) : (
    <FieldsList
      fields={
        state.filter.selectedDataTypes.length > 0
          ? state.filter.filteredFields
          : getFieldsFromState(state.fields)
      }
      state={state}
      isAddingFields={isAddingFields}
    />
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
      {multipleMappingsDeclared ? (
        <MultipleMappingsWarning />
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
            <EuiFlexItem grow={false}>
              <MappingsFilter
                isAddingFields={isAddingFields}
                isJSONVisible={isJSONVisible}
                previousState={previousState}
                setPreviousState={setPreviousState}
                state={state}
              />
            </EuiFlexItem>
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
          <EuiFlexItem grow={true}>
            <SemanticTextBanner isSemanticTextEnabled={isSemanticTextEnabled} />
          </EuiFlexItem>
          {errorSavingMappings}
          {isAddingFields && (
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="s">
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
                  <EuiPanel hasShadow={false} paddingSize="s">
                    {newFieldsLength <= 0 ? (
                      <DocumentFields
                        onCancelAddingNewFields={onCancelAddingNewFields}
                        isAddingFields={isAddingFields}
                        semanticTextInfo={semanticTextInfo}
                      />
                    ) : (
                      <DocumentFields
                        isAddingFields={isAddingFields}
                        semanticTextInfo={semanticTextInfo}
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
      {isModalVisible && (
        <TrainedModelsDeploymentModal
          pendingDeployments={pendingDeployments}
          errorsInTrainedModelDeployment={errorsInTrainedModelDeployment}
          isSemanticTextEnabled={isSemanticTextEnabled}
          setIsModalVisible={setIsModalVisible}
          refreshModal={refreshModal}
          url={url}
        />
      )}
    </>
  );
};
