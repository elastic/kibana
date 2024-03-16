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
  useEuiTheme,
  EuiEmptyPrompt,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import { Index } from '../../../../../../common';
import { useAppContext } from '../../../../app_context';
import { DocumentFieldsSearch } from '../../../../components/mappings_editor/components/document_fields/document_fields_search';
import { FieldsList } from '../../../../components/mappings_editor/components/document_fields/fields';
import { SearchResult } from '../../../../components/mappings_editor/components/document_fields/search_fields';
import { extractMappingsDefinition } from '../../../../components/mappings_editor/lib';
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
import { i18n } from '@kbn/i18n';
import { NormalizedFields } from '../../../../components/mappings_editor/types';
export const DetailsPageMappingsContent: FunctionComponent<{
  index: Index;
  data: string;
  jsonData: any;
  refetchMapping: () => void;
}> = ({ index, data, jsonData, refetchMapping }) => {
  const {
    services: { extensionsService },
    core: { getUrlForApp },
  } = useAppContext();
  const { euiTheme } = useEuiTheme();
  const [addFieldComponent, hideAddFieldComponent] = useState<boolean>(false);
  const state = useMappingsState();
  const dispatch = useDispatch();
  const indexName = index.name;
  const [isJSONVisible, setIsJSONVisible] = useState(true);
  const onToggleChange = () => {
    setIsJSONVisible(!isJSONVisible);
  };
  const newFieldsLength = useMemo(() => {
    return Object.keys(state.fields.byId).length;
  }, [state.fields.byId]);

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

  const addFieldButtonOnClick = useCallback(() => {
    hideAddFieldComponent(!addFieldComponent);
    // reset unsaved mappings and change status to create field
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
  }, [dispatch]);

  const updateMappings = useCallback(async () => {
    const { error } = await updateIndexMappings(indexName, deNormalize(state.fields));
    if (!error) {
      notificationService.showSuccessToast(
        i18n.translate('xpack.idxMgmt.indexDetails.mappings.successfullyUpdatedIndexMappings', {
          defaultMessage: 'Index Mapping was successfully updated',
          values: { indexName },
        })
      );
      refetchMapping();
    }
  }, [state.fields]);

  const pendingFieldListId = useGeneratedHtmlId({
    prefix: 'pendingFieldListId',
  });

  const {
    fields: { byId, rootLevelFields },
    search,
    documentFields,
  } = useMappingsState();

  const getField = useCallback((fieldId: string) => byId[fieldId], [byId]);
  const fields = useMemo(() => rootLevelFields.map(getField), [rootLevelFields, getField]);
  const onSearchChange = useCallback(
    (value: string) => {
      dispatch({ type: 'search:update', value });
    },
    [dispatch]
  );

  const searchTerm = search.term.trim();

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

  const treeViewBlock = (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
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
          <SearchResult result={search.result} documentFieldsState={documentFields} />
        ) : (
          <FieldsList fields={fields} />
        )}
      </EuiFlexItem>
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
      <EuiFlexGroup direction="column" wrap>
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 400px;
          `}
        >
          <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {!addFieldComponent ? (
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
                  disabled={newFieldsLength === 0 ?? true}
                  data-test-subj="indexDetailsMappingsSaveMappings"
                >
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.mappings.saveMappings"
                    defaultMessage="Save mappings"
                  />
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexItem
            grow={1}
            css={css`
              min-width: 400px;
            `}
          >
            {addFieldComponent && (
              <>
                <EuiSpacer size="m" />
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
                  borders="all"
                >
                  <EuiPanel>
                    <DocumentFields />
                  </EuiPanel>
                </EuiAccordion>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexItem>
        <EuiFlexItem
          grow={3}
          css={css`
            min-width: 600px;
          `}
        >
          <EuiPanel>
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
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );

  return (
    // using "rowReverse" to keep docs links on the top of the mappings code block on smaller screen
    <>
      <EuiFlexGroup style={{ marginBottom: euiTheme.size.l }}>
        <DocumentFieldsSearch
          searchValue={search.term}
          onSearchChange={onSearchChange}
          disabled={isJSONVisible}
        />
        <EuiButton data-test-subj="indexDetailsMappingsToggleViewButton" onClick={onToggleChange}>
          {isJSONVisible ? (
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.mappings.tableView"
              defaultMessage="List"
            />
          ) : (
            <FormattedMessage id="xpack.idxMgmt.indexDetails.mappings.json" defaultMessage="JSON" />
          )}
        </EuiButton>
      </EuiFlexGroup>
      <EuiFlexGroup
        wrap
        direction="rowReverse"
        css={css`
          height: 100%;
        `}
      >
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

        <EuiFlexItem
          grow={3}
          css={css`
            min-width: 600px;
          `}
        >
          <EuiPanel>{isJSONVisible ? jsonBlock : treeViewBlock}</EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
