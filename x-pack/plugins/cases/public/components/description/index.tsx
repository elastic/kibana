/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import styled from 'styled-components';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import * as i18n from '../user_actions/translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';
import { EditableMarkdown, ScrollableMarkdown } from '../markdown_editor';
import type { Case } from '../../containers/types';
import type { OnUpdateFields } from '../case_view/types';
import { schema } from './schema';

const DESCRIPTION_ID = 'description';
export interface DescriptionProps {
  caseData: Case;
  isLoadingDescription: boolean;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
}

const DescriptionFooter = styled(EuiFlexItem)`
  ${({ theme }) => `
    border-top: ${theme.eui.euiBorderThin};
    padding: ${theme.eui.euiSizeS};
  `}
`;

const Panel = styled(EuiPanel)`
  padding: 0;
`;

const Header = styled(EuiFlexGroup)`
  ${({ theme }) => `
    display: flex;
    padding: ${theme.eui.euiSizeS};
    align-items: center;
  `}
`;

const Body = styled(EuiFlexItem)`
  ${({ theme }) => `
    padding: ${theme.eui.euiSize};
    padding-top: 0;

    > div {
      padding: 0;
    }
  `}
`;

const getDraftDescription = (
  applicationId = '',
  caseId: string,
  commentId: string
): string | null => {
  const draftStorageKey = getMarkdownEditorStorageKey(applicationId, caseId, commentId);

  return sessionStorage.getItem(draftStorageKey);
};

export const Description = ({
  caseData,
  onUpdateField,
  isLoadingDescription,
}: DescriptionProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isEditable, setIsEditable] = useState<boolean>(false);

  const descriptionRef = useRef(null);
  const { euiTheme } = useEuiTheme();
  const { appId, permissions } = useCasesContext();

  const {
    clearDraftComment: clearLensDraftComment,
    draftComment: lensDraftComment,
    hasIncomingLensState,
  } = useLensDraftComment();

  const handleOnChangeEditable = useCallback(() => {
    clearLensDraftComment();
    setIsEditable(false);
  }, [setIsEditable, clearLensDraftComment]);

  const handleOnSave = useCallback(
    (content: string) => {
      onUpdateField({ key: DESCRIPTION_ID, value: content });
      setIsEditable(false);
    },
    [onUpdateField, setIsEditable]
  );

  const toggleCollapse = () => setIsCollapsed((oldValue: boolean) => !oldValue);

  const draftDescription = getDraftDescription(appId, caseData.id, DESCRIPTION_ID);

  if (
    hasIncomingLensState &&
    lensDraftComment !== null &&
    lensDraftComment?.commentId === DESCRIPTION_ID &&
    !isEditable
  ) {
    setIsEditable(true);
  }

  const hasUnsavedChanges =
    draftDescription && draftDescription !== caseData.description && !isLoadingDescription;

  return isEditable ? (
    <EditableMarkdown
      id="description"
      data-test-subj="description"
      caseId={caseData.id}
      content={caseData.description}
      onChangeEditable={handleOnChangeEditable}
      onSaveContent={handleOnSave}
      editorRef={descriptionRef}
      fieldName="content"
      formSchema={schema}
    />
  ) : (
    <Panel hasShadow={false} hasBorder={true} data-test-subj="description">
      <EuiFlexGroup direction="column" gutterSize={isCollapsed ? 'none' : 'm'}>
        <EuiFlexItem>
          <Header
            justifyContent="spaceBetween"
            alignItems="center"
            {...(!isCollapsed
              ? {
                  css: css`
                    border-bottom: ${euiTheme.border.thin};
                    border-radius: none;
                  `,
                }
              : {
                  css: css`
                    background: ${euiTheme.colors.lightestShade};
                    border-radius: 6px;
                    ${hasUnsavedChanges
                      ? 'border-bottom-left-radius: 0; border-bottom-right-radius: 0;'
                      : ''}
                  `,
                })}
          >
            <EuiFlexItem>
              <EuiText data-test-subj="description-title" size="s">
                {i18n.DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                {permissions.update ? (
                  <EuiButtonIcon
                    aria-label={i18n.EDIT_DESCRIPTION}
                    iconType="pencil"
                    onClick={() => setIsEditable(true)}
                    data-test-subj="description-edit-icon"
                  />
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={isCollapsed ? i18n.EXPAND_DESCRIPTION : i18n.COLLAPSE_DESCRIPTION}
                  iconType={isCollapsed ? 'unfold' : 'fold'}
                  onClick={toggleCollapse}
                  data-test-subj="description-collapse-icon"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </Header>
        </EuiFlexItem>
        {!isCollapsed ? (
          <Body>
            <ScrollableMarkdown content={caseData.description} />
          </Body>
        ) : null}
        {hasUnsavedChanges ? (
          <DescriptionFooter>
            <EuiText color="subdued" size="xs" data-test-subj="description-unsaved-draft">
              {i18n.UNSAVED_DRAFT_DESCRIPTION}
            </EuiText>
          </DescriptionFooter>
        ) : null}
      </EuiFlexGroup>
    </Panel>
  );
};

Description.displayName = 'Description';
