/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  EuiFieldSearch,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { SearchResult } from '../../../../components/mappings_editor/components/document_fields/search_fields';

import { Index } from '../../../../../../common';
import { FieldsList } from '../../../../components/mappings_editor/components/document_fields/fields';
import { extractMappingsDefinition } from '../../../../components/mappings_editor/lib';
import { MappingsEditorParsedMetadata } from '../../../../components/mappings_editor/mappings_editor';
import {
  useMappingsState,
  useDispatch,
} from '../../../../components/mappings_editor/mappings_state_context';
import { useMappingsStateListener } from '../../../../components/mappings_editor/use_state_listener';
import { useAppContext } from '../../../../app_context';
import { documentationService } from '../../../../services';

export const DetailsPageMappingsContent: FunctionComponent<{
  index: Index;
  data: string;
  jsonData: any;
}> = ({ index, data, jsonData }) => {
  const {
    services: { extensionsService },
    core: { getUrlForApp },
  } = useAppContext();
  const { euiTheme } = useEuiTheme();

  const [toggleOn, setToggleOn] = useState(true);
  const onToggleChange = () => {
    setToggleOn(!toggleOn);
  };
  const { parsedDefaultValue } = useMemo<MappingsEditorParsedMetadata>(() => {
    const mappingsDefinition = extractMappingsDefinition(jsonData);

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
  }, [jsonData]);

  useMappingsStateListener({ value: parsedDefaultValue, status: 'disabled' });

  const {
    fields: { byId, rootLevelFields },
    search,
    documentFields,
  } = useMappingsState();

  const getField = useCallback((fieldId: string) => byId[fieldId], [byId]);
  const fields = useMemo(() => rootLevelFields.map(getField), [rootLevelFields, getField]);
  const dispatch = useDispatch();
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
        <EuiFieldSearch
          style={{ minWidth: '350px' }}
          placeholder={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.documentFields.searchFieldsPlaceholder',
            {
              defaultMessage: 'Search fields',
            }
          )}
          value={search.term}
          onChange={(e) => {
            if (typeof e === 'string') {
              onSearchChange(e);
            } else {
              onSearchChange(e.target.value);
            }
          }}
          // ...

          aria-label={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.documentFields.searchFieldsAriaLabel',
            {
              defaultMessage: 'Search mapped fields',
            }
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {searchTerm !== '' ? (
          <SearchResult result={search.result} documentFieldsState={documentFields} />
        ) : (
          <FieldsList fields={fields} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    // using "rowReverse" to keep docs links on the top of the mappings code block on smaller screen
    <>
      <EuiFlexGroup style={{ marginBottom: euiTheme.size.l }}>
        <EuiButton data-test-subj="indexDetailsMappingsToggleViewButton" onClick={onToggleChange}>
          {!toggleOn ? (
            <FormattedMessage id="xpack.idxMgmt.indexDetails.mappings.json" defaultMessage="JSON" />
          ) : (
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.mappings.tableView"
              defaultMessage="Table View"
            />
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
          <EuiPanel>{toggleOn ? jsonBlock : treeViewBlock}</EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
