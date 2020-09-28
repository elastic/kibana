/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  EuiMarkdownEditor,
  EuiMarkdownEditorProps,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../shared_imports';

import * as timelineMarkdownPlugin from './plugins/timeline';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
};

const BottomContentWrapper = styled(EuiFlexGroup)`
  ${({ theme }) => `
    padding: ${theme.eui.ruleMargins.marginSmall} 0;
  `}
`;

export const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
parsingPlugins.push(timelineMarkdownPlugin.parser);

export const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();
processingPlugins[1][1].components.timeline = timelineMarkdownPlugin.renderer;

export const MarkdownEditorForm: React.FC<MarkdownEditorFormProps> = ({
  id,
  field,
  dataTestSubj,
  idAria,
  bottomRightContent,
}) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);
  const onParse = useCallback((err, { messages }) => {
    setMarkdownErrorMessages(err ? [err] : messages);
  }, []);

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      error={errorMessage}
      fullWidth
      helpText={field.helpText}
      isInvalid={isInvalid}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <>
        <EuiMarkdownEditor
          aria-label={idAria}
          editorId={id}
          onChange={field.setValue}
          value={field.value as string}
          uiPlugins={[timelineMarkdownPlugin.plugin]}
          parsingPluginList={parsingPlugins}
          processingPluginList={processingPlugins}
          onParse={onParse}
          errors={markdownErrorMessages}
        />
        {bottomRightContent && (
          <BottomContentWrapper justifyContent={'flexEnd'}>
            <EuiFlexItem grow={false}>{bottomRightContent}</EuiFlexItem>
          </BottomContentWrapper>
        )}
      </>
    </EuiFormRow>
  );
};
